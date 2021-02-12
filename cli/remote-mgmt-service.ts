import { EdgeImpulseConfig } from "./config";
import { EventEmitter } from 'tsee';
import WebSocket from 'ws';
import cbor from 'cbor';
import inquirer from 'inquirer';
import {
    MgmtInterfaceHelloResponse, MgmtInterfaceHelloV3, MgmtInterfaceSampleFinishedResponse,
    MgmtInterfaceSampleProcessingResponse,
    MgmtInterfaceSampleReadingResponse, MgmtInterfaceSampleRequest,
    MgmtInterfaceSampleRequestSample,
    MgmtInterfaceSampleResponse,
    MgmtInterfaceSampleStartedResponse,
    MgmtInterfaceSampleUploadingResponse,
    MgmtInterfaceSnapshotFailedResponse,
    MgmtInterfaceSnapshotResponse,
    MgmtInterfaceSnapshotStartedResponse,
    MgmtInterfaceSnapshotStoppedResponse,
    MgmtInterfaceStartSnapshotRequest,
    MgmtInterfaceStopSnapshotRequest
} from "../shared/MgmtInterfaceTypes";

const TCP_PREFIX = '\x1b[32m[WS ]\x1b[0m';

export type RemoteMgmtDeviceSampleEmitter = EventEmitter<{
    started: () => void,
    uploading: () => void,
    reading: (progressPercentage: number) => void,
    processing: () => void,
}>;

export interface RemoteMgmtDevice extends EventEmitter<{
    snapshot: (buffer: Buffer) => void
}> {
    connected: () => boolean;
    getDeviceId: () => Promise<string>;
    getDeviceType: () => string;
    getSensors: () => {
        name: string;
        maxSampleLengthS: number;
        frequencies: number[]
    }[];
    sampleRequest: (data: MgmtInterfaceSampleRequestSample, ee: RemoteMgmtDeviceSampleEmitter) => Promise<void>;
    supportsSnapshotStreaming: () => boolean;
    startSnapshotStreaming: () => Promise<void>;
    stopSnapshotStreaming: () => Promise<void>;
    beforeConnect: () => Promise<void>;
}

type RemoteMgmtState = 'snapshot-stream-requested' | 'snapshot-stream-started' |
                       'snapshot-stream-stopping' | 'sampling' | 'idle';

export class RemoteMgmt extends EventEmitter<{
    authenticationFailed: () => void,
}> {
    private _ws: WebSocket | undefined;
    private _projectId: number;
    private _devKeys: { apiKey: string, hmacKey: string };
    private _eiConfig: EdgeImpulseConfig;
    private _device: RemoteMgmtDevice;
    private _state: RemoteMgmtState = 'idle';

    constructor(projectId: number,
                devKeys: { apiKey: string, hmacKey: string },
                eiConfig: EdgeImpulseConfig,
                device: RemoteMgmtDevice) {

        super();

        this._projectId = projectId;
        this._devKeys = devKeys;
        this._eiConfig = eiConfig;
        this._device = device;

        this.registerPingPong();

        this._device.on('snapshot', buffer => {
            if (this._state === 'snapshot-stream-started' && this._ws) {
                let res: MgmtInterfaceSnapshotResponse = {
                    snapshotFrame: buffer.toString('base64')
                };
                if (this._ws) {
                    this._ws.send(cbor.encode(res));
                }
            }
        });
    }

    async connect() {
        await this._device.beforeConnect();

        console.log(TCP_PREFIX, `Connecting to ${this._eiConfig.endpoints.internal.ws}`);
        try {
            // @todo handle reconnect?
            this._ws = new WebSocket(this._eiConfig.endpoints.internal.ws);
            this.attachWsHandlers();
        }
        catch (ex) {
            console.error(TCP_PREFIX, 'Failed to connect to', this._eiConfig.endpoints.internal.ws, ex);
            setTimeout(() => {
                // tslint:disable-next-line: no-floating-promises
                this.connect();
            }, 1000);
        }
    }

    disconnect() {
        if (this._ws) {
            this._ws.terminate();
        }
    }

    private registerPingPong() {
        setInterval(() => {
            let myws = this._ws;
            if (myws) {
                let received = false;
                // console.log(TCP_PREFIX, 'Ping');
                myws.ping();
                myws.once('pong', () => {
                    received = true;
                    // console.log(TCP_PREFIX, 'Pong');
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

        this._ws.on('message', async (data: Buffer) => {
            let d = cbor.decode(data);
            // hello messages are handled in sendHello()
            if (typeof (<any>d).hello !== 'undefined') return;

            if (typeof (<any>d).sample !== 'undefined') {
                let s = (<MgmtInterfaceSampleRequest>d).sample;

                console.log(TCP_PREFIX, 'Incoming sampling request', this._state, s);

                let sampleHadError = false;
                let restartSnapshotOnFinished = false;

                try {
                    let ee = new EventEmitter<{
                        started: () => void,
                        reading: (progressPercentage: number) => void,
                        uploading: () => void,
                        processing: () => void,
                    }>();

                    ee.on('started', () => {
                        let res2: MgmtInterfaceSampleStartedResponse = {
                            sampleStarted: true
                        };
                        if (this._ws) {
                            this._ws.send(cbor.encode(res2));
                        }
                    });

                    ee.on('reading', (progressPercentage) => {
                        let res5: MgmtInterfaceSampleReadingResponse = {
                            sampleReading: true,
                            progressPercentage: progressPercentage
                        };
                        if (this._ws) {
                            this._ws.send(cbor.encode(res5));
                        }
                    });

                    ee.on('uploading', () => {
                        let res5: MgmtInterfaceSampleUploadingResponse = {
                            sampleUploading: true
                        };
                        if (this._ws) {
                            this._ws.send(cbor.encode(res5));
                        }
                    });

                    ee.on('processing', () => {
                        let res5: MgmtInterfaceSampleProcessingResponse = {
                            sampleProcessing: true
                        };
                        if (this._ws) {
                            this._ws.send(cbor.encode(res5));
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
                                this._ws.send(cbor.encode(res));
                            }
                        }
                    }, 1);

                    restartSnapshotOnFinished = this._state === 'snapshot-stream-started' ||
                        this._state === 'snapshot-stream-requested';

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

                    await this._device.sampleRequest(s, ee);

                    sampleHadError = true; // if finished already stop it early

                    let res3: MgmtInterfaceSampleFinishedResponse = {
                        sampleFinished: true
                    };
                    if (this._ws) {
                        this._ws.send(cbor.encode(res3));
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
                        this._ws.send(cbor.encode(res5));
                    }

                    restartSnapshotOnFinished = false;
                }
                finally {
                    this._state = 'idle';
                }

                if (restartSnapshotOnFinished) {
                    try {
                        this._state = 'snapshot-stream-requested';
                        await this._device.startSnapshotStreaming();
                        this._state = 'snapshot-stream-started';
                    }
                    catch (ex2) {
                        if (<RemoteMgmtState>this._state === 'sampling') {
                            this._state = 'idle';
                        }
                    }
                }
                return;
            }

            if (typeof (<MgmtInterfaceStartSnapshotRequest>d).startSnapshot !== 'undefined') {
                if (!this._device.supportsSnapshotStreaming()) {
                    let res1: MgmtInterfaceSnapshotFailedResponse = {
                        snapshotFailed: true,
                        error: 'Device does not support snapshot streaming'
                    };
                    if (this._ws) {
                        this._ws.send(cbor.encode(res1));
                    }
                    return;
                }

                if (this._state === 'sampling') {
                    let res1: MgmtInterfaceSnapshotFailedResponse = {
                        snapshotFailed: true,
                        error: 'Device is sampling, cannot start snapshot stream'
                    };
                    if (this._ws) {
                        this._ws.send(cbor.encode(res1));
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
                    let res3: MgmtInterfaceSnapshotStartedResponse = {
                        snapshotStarted: true
                    };
                    if (this._ws) {
                        this._ws.send(cbor.encode(res3));
                    }
                    return;
                }

                try {
                    this._state = 'snapshot-stream-requested';
                    await this._device.startSnapshotStreaming();
                    this._state = 'snapshot-stream-started';
                    let res2: MgmtInterfaceSnapshotStartedResponse = {
                        snapshotStarted: true
                    };
                    if (this._ws) {
                        this._ws.send(cbor.encode(res2));
                    }
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    let res1: MgmtInterfaceSnapshotFailedResponse = {
                        snapshotFailed: true,
                        error: ex.message || ex.toString()
                    };
                    if (this._ws) {
                        this._ws.send(cbor.encode(res1));
                    }
                    if (<RemoteMgmtState>this._state !== 'sampling') {
                        this._state = 'idle';
                    }
                }

                return;
            }

            if (typeof (<MgmtInterfaceStopSnapshotRequest>d).stopSnapshot !== 'undefined') {
                if (!this._device.supportsSnapshotStreaming()) {
                    let res1: MgmtInterfaceSnapshotFailedResponse = {
                        snapshotFailed: true,
                        error: 'Device does not support snapshot streaming'
                    };
                    if (this._ws) {
                        this._ws.send(cbor.encode(res1));
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
                    let res2: MgmtInterfaceSnapshotStoppedResponse = {
                        snapshotStopped: true
                    };
                    if (this._ws) {
                        this._ws.send(cbor.encode(res2));
                    }
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    let res1: MgmtInterfaceSnapshotFailedResponse = {
                        snapshotFailed: true,
                        error: ex.message || ex.toString()
                    };
                    if (this._ws) {
                        this._ws.send(cbor.encode(res1));
                    }
                }
                finally {
                    this._state = 'idle';
                }

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

    private async sendHello() {
        if (!this._ws || !this._device.connected()) return;

        let deviceId = await this._device.getDeviceId();

        let req: MgmtInterfaceHelloV3 = {
            hello: {
                version: 3,
                apiKey: this._devKeys.apiKey,
                deviceId: deviceId,
                deviceType: this._device.getDeviceType(),
                connection: 'daemon',
                sensors: this._device.getSensors(),
                supportsSnapshotStreaming: this._device.supportsSnapshotStreaming()
            }
        };
        this._ws.once('message', async (helloResponse: Buffer) => {
            let ret = <MgmtInterfaceHelloResponse>cbor.decode(helloResponse);
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

                console.log(TCP_PREFIX, 'Device "' + name + '" is now connected to project ' +
                    '"' + (await this.getProjectName()) + '"');
                console.log(TCP_PREFIX,
                    `Go to ${this._eiConfig.endpoints.internal.api.replace('/v1', '')}/studio/${this._projectId}/acquisition/training ` +
                    `to build your machine learning model!`);
            }
        });
        this._ws.send(cbor.encode(req));
    }

    private async checkName(deviceId: string) {
        try {
            let create = (await this._eiConfig.api.devices.createDevice(this._projectId, {
                deviceId: await this._device.getDeviceId(),
                deviceType: this._device.getDeviceType(),
                ifNotExists: true
            })).body;
            if (!create.success) {
                throw new Error('Failed to create device... ' + create.error);
            }

            let device = (await this._eiConfig.api.devices.getDevice(this._projectId, deviceId)).body.device;

            let currName = device ? device.name : deviceId;
            if (currName !== deviceId) return currName;

            let nameDevice = <{ nameDevice: string }>await inquirer.prompt([{
                type: 'input',
                message: 'What name do you want to give this device?',
                name: 'nameDevice',
                default: currName
            }]);
            if (nameDevice.nameDevice !== currName) {
                let rename = (await this._eiConfig.api.devices.renameDevice(
                    this._projectId, deviceId, { name: nameDevice.nameDevice })).body;

                if (!rename.success) {
                    throw new Error('Failed to rename device... ' + rename.error);
                }
            }
            return nameDevice.nameDevice;
        }
        catch (ex2) {
            let ex = <Error>ex2;
            throw ex.message || ex;
        }
    }

    private async getProjectName() {
        try {
            let projectBody = (await this._eiConfig.api.projects.getProjectInfo(this._projectId)).body;
            if (!projectBody.success) {
                throw projectBody.error;
            }

            return projectBody.project.name;
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

    private sleep(ms: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }
}
