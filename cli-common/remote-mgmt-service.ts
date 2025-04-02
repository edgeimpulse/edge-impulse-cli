import TypedEmitter from "typed-emitter";
import {
    MgmtInterfaceHelloResponse, MgmtInterfaceHelloV4, MgmtInterfaceSampleFinishedResponse,
    MgmtInterfaceSampleProcessingResponse,
    MgmtInterfaceSampleReadingResponse, MgmtInterfaceSampleRequest,
    MgmtInterfaceSampleRequestSample,
    MgmtInterfaceSampleResponse,
    MgmtInterfaceSampleStartedResponse,
    MgmtInterfaceSampleUploadingResponse,
    MgmtInterfaceSnapshotStreamFailedResponse,
    MgmtInterfaceSnapshotResponse,
    MgmtInterfaceSnapshotStreamStartedResponse,
    MgmtInterfaceSnapshotStreamStoppedResponse,
    MgmtInterfaceStartSnapshotStreamRequest,
    MgmtInterfaceStopSnapshotStreamRequest,
    MgmtInterfaceInferenceStreamStartedResponse,
    MgmtInterfaceStartInferenceStreamRequest,
    MgmtInterfaceInferenceStreamFailedResponse,
    MgmtInterfaceStopInferenceStreamRequest,
    MgmtInterfaceInferenceStreamStoppedResponse,
    MgmtInterfaceInferenceInfo,
    MgmtInterfaceInferenceSummary,
    MgmtInterfaceImpulseRecordAck,
    MgmtInterfaceNewModelAvailable,
    MgmtInterfaceNewModelUpdated,
    MgmtInterfaceImpulseRecordsRequest,
    MgmtInterfaceImpulseRecordsResponse,
    ClientConnectionType
} from "../shared/MgmtInterfaceTypes";
import { IWebsocket } from "../shared/daemon/iwebsocket";
import { ImpulseRecord, ImpulseRecordError, InferenceMetrics, ModelMonitor } from './model-monitor';
import { EventEmitter } from '../shared/daemon/events';
import { ModelInformation } from "../library/classifier/linux-impulse-runner";

const TCP_PREFIX = '\x1b[32m[WS ]\x1b[0m';

export type RemoteMgmtDeviceSampleEmitter = TypedEmitter<{
    started: () => void;
    uploading: () => void;
    reading: (progressPercentage: number) => void;
    processing: () => void;
}>;

export interface RemoteMgmtDevice extends TypedEmitter<{
    snapshot: (buffer: Buffer, filename: string) => void;
}>  {
    connected: () => boolean;
    getDeviceId: () => Promise<string>;
    getDeviceType: () => Promise<string>;
    getSensors: () => {
        name: string;
        maxSampleLengthS: number;
        frequencies: number[];
    }[];
    getConnectionType: () => ClientConnectionType;
    sampleRequest: (data: MgmtInterfaceSampleRequestSample, ee: RemoteMgmtDeviceSampleEmitter) => Promise<void>;
    supportsSnapshotStreaming: () => boolean;
    supportsSnapshotStreamingWhileCapturing: () => boolean;
    startSnapshotStreaming: (resolution: 'high' | 'low') => Promise<void>;
    stopSnapshotStreaming: () => Promise<void>;
    beforeConnect: () => Promise<void>;
}

export interface RemoteMgmtConfig {
    command: 'edge-impulse-linux' | 'edge-impulse-daemon';
    endpoints: {
        internal: {
            ws: string;
            api: string;
            ingestion: string;
        };
    };
    api: {
        projects: {
            getProjectInfo(projectId: number, queryParams: { impulseId?: number }):
                Promise<{ success: boolean, error?: string, project: { name: string, whitelabelId: number | null } }>;
        };
        devices: {
            renameDevice(projectId: number, deviceId: string, opts: { name: string }):
                Promise<{ success: boolean, error?: string }>;
            createDevice(projectId: number, opts: { deviceId: string, deviceType: string, ifNotExists: boolean }):
                Promise<{ success: boolean, error?: string }>;
            getDevice(projectId: number, deviceId: string):
                Promise<{ success: boolean, error?: string, device?: { name: string; } }>;
        };
        whitelabels: {
            getWhitelabelDomain(whitelabelId: number | null):
                Promise<{ success: boolean, domain?: string }>;
        }
    };
}

type RemoteMgmtState = 'snapshot-stream-requested' | 'snapshot-stream-started' |
                       'snapshot-stream-stopping' | 'sampling' | 'idle' |
                       'inference-stream-requested' | 'inference-stream-started' |
                       'inference-stream-stopping';

export class RemoteMgmt extends (EventEmitter as new () => TypedEmitter<{
    authenticationFailed: () => void,
    newModelAvailable: () => void,
}>) {
    private _ws: IWebsocket | undefined;
    private _projectId: number;
    private _devKeys: { apiKey: string, hmacKey: string };
    private _eiConfig: RemoteMgmtConfig;
    private _device: RemoteMgmtDevice;
    private _state: RemoteMgmtState = 'idle';
    private _snapshotStreamResolution: 'low' | 'high' = 'low';
    private _createWebsocket: (url: string) => IWebsocket;
    private _checkNameCb: (currName: string) => Promise<string>;
    private _monitor: ModelMonitor | undefined;
    private _isConnected = false;
    private _inferenceInfo: MgmtInterfaceInferenceInfo | undefined;

    constructor(projectId: number,
                devKeys: { apiKey: string, hmacKey: string },
                eiConfig: RemoteMgmtConfig,
                device: RemoteMgmtDevice,
                monitor: ModelMonitor | undefined,
                createWebsocket: (url: string) => IWebsocket,
                checkNameCb: (currName: string) => Promise<string>) {

        // eslint-disable-next-line constructor-super
        super();

        this._projectId = projectId;
        this._devKeys = devKeys;
        this._eiConfig = eiConfig;
        this._device = device;
        this._monitor = monitor;
        this._createWebsocket = createWebsocket;
        this._checkNameCb = checkNameCb;

        this.registerPingPong();

        this._device.on('snapshot', (buffer, filename) => {
            if (this._state === 'snapshot-stream-started' ||
                (this._state === 'sampling' && this._device.supportsSnapshotStreamingWhileCapturing()) &&
                this._ws) {

                let res: MgmtInterfaceSnapshotResponse = {
                    snapshotFrame: buffer.toString('base64'),
                    fileName: filename,
                };
                if (this._ws) {
                    this._ws.send(JSON.stringify(res));
                }
            }
        });
    }

    get isConnected() {
        return this._isConnected;
    }

    // TODO: replace inferenceInfo with a model info
    async connect(reconnectOnFailure = true, inferenceInfo: MgmtInterfaceInferenceInfo | undefined = undefined) {
        await this._device.beforeConnect();

        this._inferenceInfo = inferenceInfo;

        console.log(TCP_PREFIX, `Connecting to ${this._eiConfig.endpoints.internal.ws}`);
        try {
            // @todo handle reconnect?
            this._ws = this._createWebsocket(this._eiConfig.endpoints.internal.ws);
            this.attachWsHandlers();
        }
        catch (ex) {
            console.error(TCP_PREFIX, 'Failed to connect to', this._eiConfig.endpoints.internal.ws, ex);
            if (reconnectOnFailure) {
                setTimeout(() => {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    this.connect();
                }, 1000);
            }
            else {
                throw ex;
            }
        }
    }

    disconnect() {
        if (this._ws) {
            this._ws.terminate();
        }
    }

    inferenceSummaryListener(ev: InferenceMetrics) {
        let req: MgmtInterfaceInferenceSummary = {
            inferenceSummary: {
                firstIndex: ev.firstIndex,
                lastIndex: ev.lastIndex,
                classificationCounter: ev.classificationCounter.map((counter) => {
                    return { label: counter.label, value: counter.value };
                }),
                mean: ev.mean.map((mean) => {
                    return { label: mean.label, value: mean.value };
                }),
                standardDeviation: ev.standardDeviation.map((std) => {
                    return { label: std.label, value: std.value };
                }),
                metrics: ev.metrics.map((metric) => {
                    return { name: metric.name, value: metric.value };
                }),
            }
        };
        if (this._ws) {
            this._ws.send(JSON.stringify(req));
        }
    }

    impulseRecordListener(ev: ImpulseRecord) {
        if (!this._ws) {
            return console.error(TCP_PREFIX, 'Not connected to remote management service');
        }

        this._ws.once('message', (data: Buffer) => {
            let ret = <MgmtInterfaceImpulseRecordAck>JSON.parse(data.toString('utf-8'));
            if (!ret.impulseRecordAck) {
                if (this._monitor) {
                    this._monitor.impulseDebug = false;
                }
                console.error(TCP_PREFIX, 'Failed to send record to remote management service', ret.error);
            }
        });
        this._ws.send(JSON.stringify(ev));
    }

    impulseRecordsResponseListener(ev: ImpulseRecord | ImpulseRecordError) {
        if (!this._ws) {
            return console.error(TCP_PREFIX, 'Not connected to remote management service');
        }

        let resp: MgmtInterfaceImpulseRecordsResponse;

        if (typeof (<ImpulseRecord>ev).impulseRecord !== 'undefined') {
            resp = {
                impulseRecordsResponse: true,
                index: (<ImpulseRecord>ev).index,
                record: (<ImpulseRecord>ev).impulseRecord,
                timestamp: (<ImpulseRecord>ev).timestamp,
                rawData: (<ImpulseRecord>ev).rawData
            };
        }
        else {
            resp = {
                impulseRecordsResponse: false,
                index: (<ImpulseRecordError>ev).index,
                error: (<ImpulseRecordError>ev).error
            };
        }

        this._ws.once('message', (data: Buffer) => {
            let ret = <MgmtInterfaceImpulseRecordAck>JSON.parse(data.toString('utf-8'));
            if (!ret.impulseRecordAck) {
                this._monitor?.abortImpulseRecordsRequest();
                console.error(TCP_PREFIX, 'Failed to send record to remote management service', ret.error);
            }
        });
        this._ws.send(JSON.stringify(resp));
    }

    private registerPingPong() {
        setInterval(() => {
            let myws = this._ws;
            if (myws) {
                let received = false;
                myws.ping();
                myws.once('pong', () => {
                    received = true;
                });
                setTimeout(() => {
                    if (!received && this._ws && this._ws === myws) {
                        console.log(TCP_PREFIX, 'Not received pong from server within six seconds, re-connecting');
                        this._ws.terminate();
                    }
                }, 6000);
            }
        }, 30000);
    }

    private attachWsHandlers() {
        if (!this._ws) {
            return console.log(TCP_PREFIX, 'attachWsHandlers called without ws instance!');
        }

        this._ws.on('message', async (data: Buffer | string) => {
            let d;
            try {
                if (typeof data === 'string') {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    d = JSON.parse(data);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    d = JSON.parse(data.toString('utf-8'));
                }
            }
            catch (ex) {
                return;
            }
            // hello messages are handled in sendHello()
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (typeof (<any>d).hello !== 'undefined') return;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (typeof (<any>d).sample !== 'undefined') {
                let s = (<MgmtInterfaceSampleRequest>d).sample;

                console.log(TCP_PREFIX, 'Incoming sampling request', s);

                let sampleHadError = false;
                let restartSnapshotOnFinished = false;
                let resetStateToSnapshotStreaming = false;

                try {
                    let ee = new EventEmitter() as TypedEmitter<{
                        started: () => void,
                        reading: (progressPercentage: number) => void,
                        uploading: () => void,
                        processing: () => void,
                    }>;

                    ee.on('started', () => {
                        let res2: MgmtInterfaceSampleStartedResponse = {
                            sampleStarted: true
                        };
                        if (this._ws) {
                            this._ws.send(JSON.stringify(res2));
                        }
                    });

                    ee.on('reading', (progressPercentage) => {
                        let res5: MgmtInterfaceSampleReadingResponse = {
                            sampleReading: true,
                            progressPercentage: progressPercentage
                        };
                        if (this._ws) {
                            this._ws.send(JSON.stringify(res5));
                        }
                    });

                    ee.on('uploading', () => {
                        let res5: MgmtInterfaceSampleUploadingResponse = {
                            sampleUploading: true
                        };
                        if (this._ws) {
                            this._ws.send(JSON.stringify(res5));
                        }
                    });

                    ee.on('processing', () => {
                        let res5: MgmtInterfaceSampleProcessingResponse = {
                            sampleProcessing: true
                        };
                        if (this._ws) {
                            this._ws.send(JSON.stringify(res5));
                        }
                    });

                    // wait 1 tick, if not have thrown any error yet then everything is OK
                    // and we have received the sample request
                    setTimeout(() => {
                        if (!sampleHadError) {
                            let res: MgmtInterfaceSampleResponse = {
                                sample: true
                            };
                            if (this._ws) {
                                this._ws.send(JSON.stringify(res));
                            }
                        }
                    }, 1);

                    restartSnapshotOnFinished = (this._state === 'snapshot-stream-started' ||
                        this._state === 'snapshot-stream-requested') &&
                        !this._device.supportsSnapshotStreamingWhileCapturing();

                    resetStateToSnapshotStreaming = (this._state === 'snapshot-stream-started' ||
                        this._state === 'snapshot-stream-requested');

                    if (restartSnapshotOnFinished) {
                        // wait until snapshot stream
                        if (this._state === 'snapshot-stream-requested') {
                            await this.waitForSnapshotStartedOrIdle();
                        }
                        if (this._state === 'snapshot-stream-started') {
                            this._state = 'snapshot-stream-stopping';
                            await this._device.stopSnapshotStreaming();
                            this._state = 'idle';
                        }
                    }

                    if (this._state === 'snapshot-stream-stopping') {
                        await this.waitForSnapshotStartedOrIdle();
                    }

                    this._state = 'sampling';

                    await this._device.sampleRequest(s, <RemoteMgmtDeviceSampleEmitter><unknown>ee);

                    sampleHadError = true; // if finished already stop it early

                    let res3: MgmtInterfaceSampleFinishedResponse = {
                        sampleFinished: true
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res3));
                    }
                }
                catch (ex2) {
                    sampleHadError = true;

                    let ex = <Error>ex2;
                    console.error(TCP_PREFIX, 'Failed to sample data', ex);
                    let res5: MgmtInterfaceSampleResponse = {
                        sample: false,
                        error: ex.message || ex.toString()
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res5));
                    }
                }
                finally {
                    this._state = 'idle';
                }

                if (restartSnapshotOnFinished) {
                    try {
                        this._state = 'snapshot-stream-requested';
                        await this._device.startSnapshotStreaming(this._snapshotStreamResolution);
                        this._state = 'snapshot-stream-started';
                    }
                    catch (ex2) {
                        if (<RemoteMgmtState>this._state === 'sampling') {
                            this._state = 'idle';
                        }
                    }
                }
                else if (resetStateToSnapshotStreaming) {
                    this._state = 'snapshot-stream-started';
                }
                return;
            }

            if (typeof (<MgmtInterfaceStartSnapshotStreamRequest>d).startSnapshot !== 'undefined') {
                let req = <MgmtInterfaceStartSnapshotStreamRequest>d;
                if (!req.resolution) {
                    req.resolution = 'low';
                }

                if (!this._device.supportsSnapshotStreaming()) {
                    let res1: MgmtInterfaceSnapshotStreamFailedResponse = {
                        snapshotFailed: true,
                        error: 'Device does not support snapshot streaming'
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res1));
                    }
                    return;
                }

                if (this._state === 'sampling') {
                    let res1: MgmtInterfaceSnapshotStreamFailedResponse = {
                        snapshotFailed: true,
                        error: 'Device is sampling, cannot start snapshot stream'
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res1));
                    }
                    return;
                }

                // already requested, skip this
                if (this._state === 'snapshot-stream-requested' ||
                    this._state === 'snapshot-stream-stopping') {
                    return;
                }

                // already started? then send the OK message nonetheless
                if (this._state === 'snapshot-stream-started') {
                    // already in snapshot mode...
                    let res3: MgmtInterfaceSnapshotStreamStartedResponse = {
                        snapshotStarted: true
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res3));
                    }
                    return;
                }

                try {
                    this._state = 'snapshot-stream-requested';
                    await this._device.startSnapshotStreaming(req.resolution);
                    this._state = 'snapshot-stream-started';
                    this._snapshotStreamResolution = req.resolution;
                    let res2: MgmtInterfaceSnapshotStreamStartedResponse = {
                        snapshotStarted: true
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res2));
                    }
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    let res1: MgmtInterfaceSnapshotStreamFailedResponse = {
                        snapshotFailed: true,
                        error: ex.message || ex.toString()
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res1));
                    }
                    if (<RemoteMgmtState>this._state !== 'sampling') {
                        this._state = 'idle';
                    }
                }

                return;
            }

            if (typeof (<MgmtInterfaceStopSnapshotStreamRequest>d).stopSnapshot !== 'undefined') {
                if (!this._device.supportsSnapshotStreaming()) {
                    let res1: MgmtInterfaceSnapshotStreamFailedResponse = {
                        snapshotFailed: true,
                        error: 'Device does not support snapshot streaming'
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res1));
                    }
                    return;
                }

                if (this._state === 'snapshot-stream-requested') {
                    await this.waitForSnapshotStartedOrIdle();
                }

                if (this._state !== 'snapshot-stream-started') {
                    return;
                }

                try {
                    this._state = 'snapshot-stream-stopping';
                    await this._device.stopSnapshotStreaming();
                    this._state = 'idle';
                    let res2: MgmtInterfaceSnapshotStreamStoppedResponse = {
                        snapshotStopped: true
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res2));
                    }
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    let res1: MgmtInterfaceSnapshotStreamFailedResponse = {
                        snapshotFailed: true,
                        error: ex.message || ex.toString()
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(res1));
                    }
                }
                finally {
                    this._state = 'idle';
                }

                return;
            }

            if (typeof (<MgmtInterfaceStartInferenceStreamRequest>d).startInferenceStream !== 'undefined') {
                let resp: MgmtInterfaceInferenceStreamStartedResponse = {
                    inferenceStreamStarted: this._monitor ? (this._monitor.impulseDebug = true, true) : false
                };

                if (this._ws) {
                    this._ws.send(JSON.stringify(resp));
                }
                return;
            }

            if (typeof (<MgmtInterfaceStopInferenceStreamRequest>d).stopInferenceStream !== 'undefined') {
                let resp: MgmtInterfaceInferenceStreamStoppedResponse = {
                    inferenceStreamStopped: this._monitor ? (this._monitor.impulseDebug = false, true) : false
                };

                if (this._ws) {
                    this._ws.send(JSON.stringify(resp));
                }
                return;
            }

            if (typeof (<MgmtInterfaceNewModelAvailable>d).newModelAvailable !== 'undefined') {
                console.log(TCP_PREFIX, 'New model available, requesting download');
                this.emit('newModelAvailable');
                return;
            }

            if (typeof (<MgmtInterfaceImpulseRecordsRequest>d).impulseRecordRequest !== 'undefined') {
                let req = <MgmtInterfaceImpulseRecordsRequest>d;
                if (!this._monitor) {
                    let resp: MgmtInterfaceImpulseRecordsResponse = {
                        impulseRecordsResponse: false,
                        error: 'Model monitor not initialized'
                    };
                    if (this._ws) {
                        this._ws.send(JSON.stringify(resp));
                    }
                    return;
                }
                this._monitor.getImpulseRecords(req.impulseRecordRequest);
                return;
            }

            console.log(TCP_PREFIX, 'received message', d);

            // // let d = data.toString('ascii');
            // if (d.indexOf('EI_PUBLIC_IP') > -1) {
            //     d = d.replace('EI_PUBLIC_IP', ips[0].address + ':4810');
            //     data = Buffer.from(d, 'ascii');
            // }

            // console.log(TCP_PREFIX, 'Received over TCP', data.toString('ascii'));
            // serial.write(data);
        });

        this._ws.on('error', err => {
            console.error(TCP_PREFIX,
                `Error connecting to ${this._eiConfig.endpoints.internal.ws}`,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                (<any>err).code || err);
        });

        this._ws.on('close', () => {
            console.log(TCP_PREFIX, 'Trying to connect in 1 second...');
            setTimeout(this.connect.bind(this), 1000);
            if (this._ws) {
                this._ws.removeAllListeners();
            }
            this._ws = undefined;
        });

        this._ws.on('open', async () => {
            console.log(TCP_PREFIX, `Connected to ${this._eiConfig.endpoints.internal.ws}`);

            try {
                await this.sendHello();
            }
            catch (ex2) {
                let ex = <Error>ex2;
                console.error(TCP_PREFIX,
                    'Failed to connect to remote management service', ex.message || ex.toString(),
                    'retrying in 5 seconds...');
                setTimeout(this.sendHello.bind(this), 5000);
            }
        });
    }

    async sendModelUpdateStatus(model: ModelInformation, success: boolean, error?: string) {
        if (!this._ws) return;

        let req: MgmtInterfaceNewModelUpdated;
        if (success) {
            req = {
                modelUpdateSuccess: true,
                inferenceInfo: {
                    projectId: model.project.id,
                    projectOwner: model.project.owner,
                    projectName: model.project.name,
                    deploymentVersion: model.project.deploy_version,
                    modelType: model.modelParameters.model_type,
                }
            };
        }
        else {
            req = {
                modelUpdateSuccess: false,
                error: error || 'No error message',
            };
        }

        this._ws.send(JSON.stringify(req));
    }

    private async sendHello() {
        if (!this._ws || !this._device.connected()) return;

        let deviceId = await this._device.getDeviceId();
        let storageStatus = await this._monitor?.getStorageStatus();
        let req: MgmtInterfaceHelloV4;

        const baseHello = {
            apiKey: this._devKeys.apiKey,
            deviceId: deviceId,
            deviceType: await this._device.getDeviceType(),
            connection: this._device.getConnectionType(),
            sensors: this._device.getSensors(),
            supportsSnapshotStreaming: this._device.supportsSnapshotStreaming(),
        };

        if (this._inferenceInfo) {
            req = {
                hello: {
                    ...baseHello,
                    version: 4, // Ensure version is explicitly set to 4
                    mode: 'inference',
                    inferenceInfo: this._inferenceInfo,
                    availableRecords: storageStatus ? {
                        firstIndex: storageStatus.firstIndex,
                        firstTimestamp: storageStatus.firstTimestamp,
                        lastIndex: storageStatus.lastIndex,
                        lastTimestamp: storageStatus.lastTimestamp
                    } : {
                        firstIndex: 0,
                        firstTimestamp: 0,
                        lastIndex: 0,
                        lastTimestamp: 0
                    }
                }
            };
        }
        else {
            req = {
                hello: {
                    ...baseHello,
                    version: 4, // Ensure version is explicitly set to 4
                    mode: 'ingestion'
                }
            };
        }

        this._ws.once('message', async (helloResponse: Buffer) => {
            let ret = <MgmtInterfaceHelloResponse>JSON.parse(helloResponse.toString('utf-8'));
            if (!ret.hello) {
                console.error(TCP_PREFIX, 'Failed to authenticate, API key not correct?', ret.err);
                this.emit('authenticationFailed');
                if (this._ws) {
                    this._ws.removeAllListeners();
                    this._ws.terminate();
                    this._ws = undefined;
                }
            }
            else {
                if (!deviceId) {
                    throw new Error('Could not read serial number for device');
                }
                let name = await this.checkName(deviceId);

                const projectInfo = await this.getProjectInfo();
                let studioUrl = this._eiConfig.endpoints.internal.api.replace('/v1', '');
                if (projectInfo.whitelabelId) {
                    const whitelabelRes = await this._eiConfig.api.whitelabels.getWhitelabelDomain(
                        projectInfo.whitelabelId
                    );
                    if (whitelabelRes.domain) {
                        const protocol = this._eiConfig.endpoints.internal.api.startsWith('https') ? 'https' : 'http';
                        studioUrl = `${protocol}://${whitelabelRes.domain}`;
                    }
                }

                console.log(TCP_PREFIX, 'Device "' + name + '" is now connected to project ' +
                    '"' + projectInfo.name + '". ' +
                    'To connect to another project, run `' + this._eiConfig.command + ' --clean`.');
                console.log(TCP_PREFIX,
                    `Go to ${studioUrl}/studio/${this._projectId}/acquisition/training ` +
                    `to build your machine learning model!`);
                this._isConnected = true;
            }
        });
        this._ws.send(JSON.stringify(req));
    }

    private async checkName(deviceId: string) {
        try {
            let create = (await this._eiConfig.api.devices.createDevice(this._projectId, {
                deviceId: await this._device.getDeviceId(),
                deviceType: await this._device.getDeviceType(),
                ifNotExists: true
            }));

            let device = (await this._eiConfig.api.devices.getDevice(this._projectId, deviceId)).device;

            let currName = device ? device.name : deviceId;
            if (currName !== deviceId) return currName;

            let newName = await this._checkNameCb(currName);

            if (newName !== currName) {
                (await this._eiConfig.api.devices.renameDevice(
                    this._projectId, deviceId, { name: newName }));
            }
            return newName;
        }
        catch (ex2) {
            let ex = <Error>ex2;
            throw ex.message || ex;
        }
    }

    private async getProjectInfo() {
        try {
            let projectBody = (await this._eiConfig.api.projects.getProjectInfo(this._projectId, { }));
            return projectBody.project;
        }
        catch (ex2) {
            let ex = <Error>ex2;
            throw ex.message || ex;
        }
    }

    private async waitForSnapshotStartedOrIdle() {
        let max = Date.now() + (5 * 1000);
        while (1) {
            if (Date.now() > max) {
                throw new Error('Timeout when waiting for snapshot to be started or idle');
            }
            await this.sleep(200);
            if (this._state === 'snapshot-stream-started' || this._state === 'idle') {
                return;
            }
        }
    }

    private async waitForInferenceStreamStartedOrIdle() {
        let max = Date.now() + (5 * 1000);
        while (1) {
            if (Date.now() > max) {
                throw new Error('Timeout when waiting for inference stream to be started or idle');
            }
            await this.sleep(200);
            if (this._state === 'inference-stream-started' || this._state === 'idle') {
                return;
            }
        }
    }

    private sleep(ms: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }
}
