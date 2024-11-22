#!/usr/bin/env node

import { SerialConnector } from './serial-connector';
import TypedEmitter from "typed-emitter";
import EiSerialProtocol, {
    EiSerialDeviceConfig, EiSerialWifiNetwork, EiSerialWifiSecurity, EiStartSamplingResponse, EiSerialDone,
    EiSerialDoneBuffer,
    EiSnapshotResponse
} from '../shared/daemon/ei-serial-protocol';
import inquirer from 'inquirer';
import request from 'request-promise';
import {
    MgmtInterfaceSampleRequestSample,
    ClientConnectionType
} from '../shared/MgmtInterfaceTypes';
import { Config, EdgeImpulseConfig } from '../cli-common/config';
import { findSerial } from './find-serial';
import { canFlashSerial } from './can-flash-serial';
import jpegjs from 'jpeg-js';
import { RemoteMgmt, RemoteMgmtDevice, RemoteMgmtDeviceSampleEmitter } from '../cli-common/remote-mgmt-service';
import { EventEmitter } from "tsee";
import { getCliVersion, initCliApp, setupCliApp } from '../cli-common/init-cli-app';
import { Mutex } from 'async-mutex';
import WebSocket from 'ws';
import encodeLabel from '../shared/encoding';
import { upload } from '../cli-common/make-image';

const TCP_PREFIX = '\x1b[32m[WS ]\x1b[0m';
const SERIAL_PREFIX = '\x1b[33m[SER]\x1b[0m';

const versionArgv = process.argv.indexOf('--version') > -1;
const cleanArgv = process.argv.indexOf('--clean') > -1;
const silentArgv = process.argv.indexOf('--silent') > -1;
const devArgv = process.argv.indexOf('--dev') > -1;
const verboseArgv = process.argv.indexOf('--verbose') > -1;
const apiKeyArgvIx = process.argv.indexOf('--api-key');
const apiKeyArgv = apiKeyArgvIx !== -1 ? process.argv[apiKeyArgvIx + 1] : undefined;
const baudRateArgvIx = process.argv.indexOf('--baud-rate');
const baudRateArgv = baudRateArgvIx !== -1 ? process.argv[baudRateArgvIx + 1] : undefined;
const whichDeviceArgvIx = process.argv.indexOf('--which-device');
const whichDeviceArgv = whichDeviceArgvIx !== -1 ? Number(process.argv[whichDeviceArgvIx + 1]) : undefined;

let configFactory: Config;
let serial: SerialConnector | undefined;

const cliOptions = {
    appName: 'Edge Impulse serial daemon',
    apiKeyArgv: apiKeyArgv,
    greengrassArgv: false,
    cleanArgv: cleanArgv,
    devArgv: devArgv,
    hmacKeyArgv: undefined,
    silentArgv: silentArgv,
    verboseArgv: verboseArgv,
    connectProjectMsg: 'To which project do you want to connect this device?',
    getProjectFromConfig: async (deviceId: string | undefined) => {
        if (!deviceId) return undefined;
        return await configFactory.getDaemonDevice(deviceId);
    }
};

class SerialDevice extends (EventEmitter as new () => TypedEmitter<{
    snapshot: (buffer: Buffer, filename: string) => void
}>) implements RemoteMgmtDevice  {
    private _config: EdgeImpulseConfig;
    private _serial: SerialConnector;
    private _serialProtocol: EiSerialProtocol;
    private _deviceConfig: EiSerialDeviceConfig;
    private _snapshotStream: {
        ee: TypedEmitter<{
            snapshot: (b: Buffer, w: number, h: number) => void,
            error: (err: string) => void
        }>,
        stop: () => Promise<void>
    } | undefined;
    private _lastSnapshot: Date = new Date(0);
    private _snapshotMutex = new Mutex();
    private _snapshotId = 0;
    private _waitingForSnapshotToStart = false;

    constructor(config: EdgeImpulseConfig, serialConnector: SerialConnector, serialProtocol: EiSerialProtocol,
                deviceConfig: EiSerialDeviceConfig) {
        // eslint-disable-next-line constructor-super
        super();

        this._config = config;
        this._serial = serialConnector;
        this._serialProtocol = serialProtocol;
        this._deviceConfig = deviceConfig;
    }

    connected() {
        return this._serial.isConnected();
    }

    async getDeviceId() {
        return this._deviceConfig.info.id;
    }

    getDeviceType() {
        return this._deviceConfig.info.type;
    }

    getSensors() {
        let sensors = Array.from(this._deviceConfig.sensors); // copy sensors so we don't modify in place
        if (this._deviceConfig.snapshot.hasSnapshot) {
            for (let s of this._deviceConfig.snapshot.resolutions) {
                sensors.push({
                    name: 'Camera (' + s.width + 'x' + s.height + ')',
                    frequencies: [],
                    maxSampleLengthS: 60000
                });
            }
        }

        return sensors;
    }

    getConnectionType() {
        return <ClientConnectionType>'daemon';
    }

    isSnapshotStreaming() {
        return !!this._snapshotStream;
    }

    supportsSnapshotStreaming() {
        return this._deviceConfig.snapshot.supportsStreaming;
    }

    supportsSnapshotStreamingWhileCapturing() {
        return false;
    }

    async stopSnapshotStreamFromSignal() {
        if (!this._waitingForSnapshotToStart && !this._snapshotStream) {
            return;
        }

        if (this._waitingForSnapshotToStart) {
            // max 5 sec
            let max = Date.now() + 5000;
            while (1) {
                if (Date.now() > max) {
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
                if (this._snapshotStream) {
                    break;
                }
            }
        }

        try {
            // wait for 1 snapshot to make sure we are fully attached
            await new Promise((resolve, reject) => {
                if (!this._snapshotStream) {
                    throw new Error('No snapshot stream');
                }
                this._snapshotStream.ee.once('snapshot', resolve);
                this._snapshotStream.ee.once('error', reject);
            });

            await this.stopSnapshotStreaming();
        }
        catch (ex2) {
            console.log(SERIAL_PREFIX, 'stopSnapshotStreamFromSignal failed', ex2);
        }
    }

    async startSnapshotStreaming() {
        if (this._snapshotStream) {
            throw new Error('Snapshot stream already in progress');
        }

        console.log(SERIAL_PREFIX, 'Entering snapshot stream mode...');

        this._waitingForSnapshotToStart = true;

        try {
            this._snapshotStream = await this._serialProtocol.startSnapshotStream('low');
        }
        finally {
            this._waitingForSnapshotToStart = false;
        }

        this._snapshotStream.ee.on('error', err => {
            console.warn(SERIAL_PREFIX, 'Snapshot stream error:', err);
            this._snapshotStream = undefined;
        });
        this._snapshotStream.ee.on('snapshot', async (buffer, width, height) => {
            const id = ++this._snapshotId;
            const release = await this._snapshotMutex.acquire();

            // limit to 5 frames a second & no new frames should have come in...
            try {
                if (Date.now() - +this._lastSnapshot > 200 &&
                    id === this._snapshotId) {
                    let jpegImage: Buffer;

                    let depth = buffer.length / (width * height);
                    if (depth === 1 || depth === 3) {
                        let frameData = Buffer.alloc(width * height * 4);
                        let frameDataIx = 0;
                        for (let ix = 0; ix < buffer.length; ix += depth) {
                            if (depth === 1) {
                                frameData[frameDataIx++] = buffer[ix]; // r
                                frameData[frameDataIx++] = buffer[ix]; // g
                                frameData[frameDataIx++] = buffer[ix]; // b
                                frameData[frameDataIx++] = 255;
                            }
                            else {
                                frameData[frameDataIx++] = buffer[ix + 0]; // r
                                frameData[frameDataIx++] = buffer[ix + 1]; // g
                                frameData[frameDataIx++] = buffer[ix + 2]; // b
                                frameData[frameDataIx++] = 255;
                            }
                        }

                        let jpegImageData = jpegjs.encode({
                            data: frameData,
                            width: width,
                            height: height,
                        }, 80);
                        jpegImage = jpegImageData.data;
                    }
                    else if(isJpeg(buffer)) {
                        jpegImage = buffer;
                    }
                    else {
                        throw new Error('Received snapshot is not a RAW or JPEG image. ' +
                            'For RAW expected ' + (width * height) + ' or ' +
                            (width * height * 3) + ' values, but got ' + buffer.length);
                    }

                    this.emit('snapshot', jpegImage, '');
                    this._lastSnapshot = new Date();
                }
            }
            catch (ex) {
                console.warn('Failed to handle snapshot', ex);
            }
            finally {
                release();
            }
        });

        await new Promise((resolve, reject) => {
            if (!this._snapshotStream) {
                throw new Error('No snapshot stream');
            }
            this._snapshotStream.ee.once('snapshot', resolve);
            this._snapshotStream.ee.once('error', reject);
        });
    }

    async stopSnapshotStreaming() {
        if (!this._snapshotStream) {
            return;
        }

        console.log(SERIAL_PREFIX, 'Stopping snapshot stream mode...');
        try {
            await this._snapshotStream.stop();
            this._snapshotStream = undefined;
            console.log(SERIAL_PREFIX, 'Stopped snapshot stream mode');
        }
        catch (ex) {
            console.log(SERIAL_PREFIX, 'Stopped snapshot stream mode failed', ex);
            throw ex;
        }
    }

    async beforeConnect() {
        // if our connection dropped because the device is now connected over wifi
        // (only 1 device ID can connect at the same time)
        // then we don't want to reconnect naturally
        this._deviceConfig = await this._serialProtocol.getConfig();
        if (this._deviceConfig.management.connected) {
            console.log(SERIAL_PREFIX, 'Device is connected over WiFi to remote management API, ' +
                'no need to run the daemon. Exiting...');
            process.exit(1);
        }
        else {
            if (!this._deviceConfig.upload.apiKey || !this._deviceConfig.info.id || !this._deviceConfig.info.type) {
                console.error(SERIAL_PREFIX, 'Cannot connect to remote management API using daemon, failed to read ' +
                    'apiKey, deviceId or deviceType from device. Restarting your development board might help. ' +
                    'Retrying in 5 seconds...');
                setTimeout(serial_connect, 5000);
                return;
            }

            console.log(SERIAL_PREFIX, 'Device is not connected to remote management API, ' +
                'will use daemon');
        }
    }

    setDeviceConfig(deviceConfig: EiSerialDeviceConfig) {
        this._deviceConfig = deviceConfig;
    }

    async sampleRequest(data: MgmtInterfaceSampleRequestSample, ee: RemoteMgmtDeviceSampleEmitter) {

        let s = data;

        if (!this._deviceConfig.upload.apiKey) {
            throw new Error('Device does not have API key');
        }

        if (s.sensor?.startsWith('Camera (')) {
            let [ width, height ] = s.sensor.replace('Camera (', '')
                .replace(')', '').split('x').map(n => Number(n));
            if (isNaN(width) || isNaN(height)) {
                throw new Error('Could not parse camera resolution ' + s.sensor);
            }

            console.log(SERIAL_PREFIX, 'Taking snapshot...');

            let sampleReq = await this._serialProtocol.takeSnapshot(width, height);

            function waitForSamplingDone(ee2: EiSnapshotResponse): Promise<Buffer> {
                return new Promise<Buffer>((resolve, reject) => {
                    ee2.on('done', (ev) => resolve(ev));
                    ee2.on('error', reject);
                });
            }

            sampleReq.on('started', () => {
                ee.emit('started');
            });

            sampleReq.on('readingFromDevice', progressPercentage => {
                ee.emit('reading', progressPercentage);
            });

            let snapshot = await waitForSamplingDone(sampleReq);

            ee.emit('processing');

            let jpegImage: Buffer;
            let depth = snapshot.length / (width * height);
            if (depth === 1 || depth === 3) {

                let frameData = Buffer.alloc(width * height * 4);
                let frameDataIx = 0;
                for (let ix = 0; ix < snapshot.length; ix += depth) {
                    if (depth === 1) {
                        frameData[frameDataIx++] = snapshot[ix]; // r
                        frameData[frameDataIx++] = snapshot[ix]; // g
                        frameData[frameDataIx++] = snapshot[ix]; // b
                        frameData[frameDataIx++] = 255;
                    }
                    else {
                        frameData[frameDataIx++] = snapshot[ix + 0]; // r
                        frameData[frameDataIx++] = snapshot[ix + 1]; // g
                        frameData[frameDataIx++] = snapshot[ix + 2]; // b
                        frameData[frameDataIx++] = 255;
                    }
                }

                let jpegImageData = jpegjs.encode({
                    data: frameData,
                    width: width,
                    height: height,
                }, 100);
                jpegImage = jpegImageData.data;
            }
            else if(isJpeg(snapshot)) {
                jpegImage = snapshot;
            }
            else {
                throw new Error('Received snapshot is not a RAW or JPEG image. ' +
                    'For RAW expected ' + (width * height) + ' or ' +
                    (width * height * 3) + ' values, but got ' + snapshot.length);
            }
            let url = this._config.endpoints.internal.ingestion + s.path;
            console.log(SERIAL_PREFIX, 'Uploading to', url);

            ee.emit('uploading');

            await upload({
                filename: s.label + '.jpg',
                allowDuplicates: false,
                apiKey: this._deviceConfig.upload.apiKey,
                buffer: jpegImage,
                category: s.path.indexOf('training') > -1 ? 'training' : 'testing',
                config: this._config,
                label: { label: s.label, type: 'label' },
                boundingBoxes: undefined,
                metadata: undefined,
                addDateId: true,
            });

            console.log(SERIAL_PREFIX, 'Uploading to', url, 'OK');
        }
        else {
            await this._serialProtocol.setSampleSettings(s.label,
                s.interval, s.length, s.hmacKey);

            await this._serialProtocol.setUploadSettings(this._deviceConfig.upload.apiKey, s.path);
            console.log(SERIAL_PREFIX, 'Configured upload settings');

            function waitForSamplingDone(ee2: EiStartSamplingResponse): Promise<EiSerialDone> {
                return new Promise((resolve, reject) => {
                    ee2.on('done', (ev) => resolve(ev));
                    ee2.on('error', reject);
                });
            }

            let sampleReq = this._serialProtocol.startSampling(s.sensor, s.length + 3000);

            sampleReq.on('samplingStarted', () => {
                ee.emit('started');
            });

            sampleReq.on('processing', () => {
                ee.emit('processing');
            });

            sampleReq.on('readingFromDevice', (progressPercentage) => {
                ee.emit('reading', progressPercentage);
            });

            sampleReq.on('uploading', () => {
                ee.emit('uploading');
            });

            let deviceResponse = await waitForSamplingDone(sampleReq);

            if (deviceResponse && deviceResponse.file) {
                ee.emit('uploading');

                let url = this._config.endpoints.internal.ingestion + s.path;
                try {
                    console.log(SERIAL_PREFIX, 'Uploading to', url);
                    if (deviceResponse.file &&
                        deviceResponse.file.indexOf(Buffer.from('Ref-BINARY-', 'ascii')) > -1) {

                        let dr = <EiSerialDoneBuffer>deviceResponse;
                        await request.post(url, {
                            headers: {
                                'x-api-key': this._deviceConfig.upload.apiKey,
                                'x-file-name': encodeLabel(deviceResponse.filename),
                                'x-label': encodeLabel(dr.label),
                                'Content-Type': 'application/octet-stream'
                            },
                            body: deviceResponse.file,
                            encoding: 'binary'
                        });
                    }
                    else {
                        await request.post(url, {
                            headers: {
                                'x-api-key': this._deviceConfig.upload.apiKey,
                                'x-file-name': encodeLabel(deviceResponse.filename),
                                'Content-Type': 'application/cbor'
                            },
                            body: deviceResponse.file,
                            encoding: 'binary'
                        });
                        await this._serialProtocol.unlink(deviceResponse.onDeviceFileName);
                    }
                    console.log(SERIAL_PREFIX, 'Uploading to', url, 'OK');
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    console.error(SERIAL_PREFIX, 'Failed to upload to', url, ex);
                }
            }
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    try {
        if (versionArgv) {
            console.log(getCliVersion());
            process.exit(0);
        }

        let baudRate = baudRateArgv ? Number(baudRateArgv) : 115200;
        if (isNaN(baudRate)) {
            console.error('Invalid value for --baud-rate (should be a number)');
            process.exit(1);
        }

        const initRes = await initCliApp(cliOptions);
        configFactory = initRes.configFactory;
        const config = initRes.config;

        console.log('Endpoints:');
        console.log('    Websocket:', config.endpoints.internal.ws);
        console.log('    API:      ', config.endpoints.internal.api);
        console.log('    Ingestion:', config.endpoints.internal.ingestion);
        console.log('');

        let deviceId = await findSerial(whichDeviceArgv);
        await connectToSerial(config, deviceId, baudRate, (cleanArgv || apiKeyArgv) ? true : false);
    }
    catch (ex) {
        console.error('Failed to set up serial daemon', ex);
    }
})();

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

async function connectToSerial(eiConfig: EdgeImpulseConfig, deviceId: string, baudRate: number, clean: boolean) {
    // if this is set it means we have a connection
    let config: EiSerialDeviceConfig | undefined;
    let remoteMgmt: RemoteMgmt | undefined;

    serial = new SerialConnector(deviceId, baudRate, cliOptions.verboseArgv);
    const serialProtocol = new EiSerialProtocol(serial);

    serial.on('error', err => {
        console.log(SERIAL_PREFIX, 'Serial error - retrying in 5 seconds', err);
        if (remoteMgmt) {
            remoteMgmt.disconnect();
        }
        setTimeout(serial_connect, 5000);
    });
    serial.on('close', () => {
        console.log(SERIAL_PREFIX, 'Serial closed - retrying in 5 seconds');
        if (remoteMgmt) {
            remoteMgmt.disconnect();
        }
        setTimeout(serial_connect, 5000);
    });
    // serial.on('data', data => {
    //     console.log(SERIAL_PREFIX, 'serial data', data, data.toString('ascii'));
    //     // client.write(data);
    // });
    async function connectLogic() {
        if (!serial || !serial.isConnected()) return setTimeout(serial_connect, 5000);

        config = undefined;
        console.log(SERIAL_PREFIX, 'Serial is connected, trying to read config...');

        try {
            await serialProtocol.onConnected();

            if (clean) {
                console.log(SERIAL_PREFIX, 'Clearing configuration');
                await serialProtocol.clearConfig();
                console.log(SERIAL_PREFIX, 'Clearing configuration OK');
            }

            config = await serialProtocol.getConfig();

            console.log(SERIAL_PREFIX, 'Retrieved configuration');
            console.log(SERIAL_PREFIX, 'Device is running AT command version ' +
                config.info.atCommandVersion.major + '.' + config.info.atCommandVersion.minor + '.' +
                config.info.atCommandVersion.patch);

            // we support devices with version 1.8.x and lower
            // BE CAREFUL! Changing the required AT major/minior version will break the compatibility
            // with the devices that are already in the field!!! Use wisely!!!
            // Maybe your change requires optional AT command?
            if (config.info.atCommandVersion.major > 1 || config.info.atCommandVersion.minor > 8) {
                console.error(SERIAL_PREFIX,
                    'Unsupported AT command version running on this device. Supported version is 1.8.x and lower, ' +
                    'but found ' + config.info.atCommandVersion.major + '.' + config.info.atCommandVersion.minor + '.' +
                    config.info.atCommandVersion.patch + '.');
                console.error(SERIAL_PREFIX,
                    'Update the Edge Impulse CLI tools (via `npm update edge-impulse-cli -g`) ' +
                    'to continue.');
                process.exit(1);
            }

            let serialId = await serial.getMACAddress() || undefined;

            const { projectId, devKeys } = await setupCliApp(configFactory, eiConfig, cliOptions,
                serialId);

            if (serialId) {
                await configFactory.storeDaemonDevice(serialId, { projectId: projectId });
            }

            let setupRes = silentArgv ?
                { hasWifi: true, setupOK: true, didSetMgmt: false } :
                await setupWizard(eiConfig, serialProtocol, config, devKeys);
            if (setupRes.setupOK) {
                if (((!config.management.connected) || setupRes.didSetMgmt) && setupRes.hasWifi && !silentArgv) {
                    console.log(SERIAL_PREFIX, 'Verifying whether device can connect to remote management API...');
                    await sleep(5000); // Q: is this enough?
                }

                config = await serialProtocol.getConfig();

                if (config.management.connected) {
                    console.log(SERIAL_PREFIX, 'Device is connected over WiFi to remote management API, ' +
                        'no need to run the daemon. Exiting...');
                    process.exit(1);
                }
            }
            else {
                config = await serialProtocol.getConfig();
            }

            if (config.management.lastError) {
                console.log(SERIAL_PREFIX, 'Remote management connection error', config.management.lastError);
            }

            if (!remoteMgmt) {
                const device = new SerialDevice(eiConfig, serial, serialProtocol, config);
                remoteMgmt = new RemoteMgmt(projectId,
                    devKeys,
                    Object.assign({
                        command: <'edge-impulse-daemon'>'edge-impulse-daemon'
                    }, eiConfig),
                    device,
                    undefined, // model monitor object
                    url => new WebSocket(url),
                    async (currName) => {
                        let nameDevice = <{ nameDevice: string }>await inquirer.prompt([{
                            type: 'input',
                            message: 'What name do you want to give this device?',
                            name: 'nameDevice',
                            default: currName
                        }]);
                        return nameDevice.nameDevice;
                    });

                let firstExit = true;

                const onSignal = async () => {
                    if (!firstExit) {
                        process.exit(1);
                    }
                    else {
                        console.log(SERIAL_PREFIX, 'Received stop signal, stopping application... ' +
                            'Press CTRL+C again to force quit.');
                        firstExit = false;
                        try {
                            await device.stopSnapshotStreamFromSignal();
                            process.exit(0);
                        }
                        catch (ex2) {
                            let ex = <Error>ex2;
                            console.log(SERIAL_PREFIX, 'Failed to stop snapshot streaming', ex.message);
                        }
                        process.exit(1);
                    }
                };

                process.on('SIGHUP', onSignal);
                process.on('SIGINT', onSignal);
            }

            await remoteMgmt.connect();
        }
        catch (ex) {
            console.error(SERIAL_PREFIX, 'Failed to get info off device', ex);
            if (await canFlashSerial(deviceId)) {
                // flashed...
                console.log(SERIAL_PREFIX, 'Waiting for board to restart...');
                if (process.platform === 'linux') {
                    setTimeout(connectLogic, 20000);
                }
                else if (process.platform !== 'darwin') {
                    setTimeout(connectLogic, 2000);
                }
                // macOS does it themselves
            }
            else {
                setTimeout(connectLogic, 5000);
            }
        }
    }
    serial.on('connected', connectLogic);

    console.log(SERIAL_PREFIX, 'Connecting to', deviceId);

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    serial_connect();
}

async function serial_connect() {
    if (!serial) return;

    try {
        await serial.connect();
    }
    catch (ex2) {
        let ex = <Error>ex2;
        console.error(SERIAL_PREFIX, 'Failed to connect to', serial.getPath(),
            'retrying in 5 seconds', ex.message || ex);
        if (ex.message && ex.message.indexOf('Permission denied') > -1) {
            console.error(SERIAL_PREFIX, 'You might need `sudo` or set up the right udev rules');
        }
        setTimeout(serial_connect, 5000);
    }
}

let setupWizardRan = false;

async function setupWizard(eiConfig: EdgeImpulseConfig,
                           serialProtocol: EiSerialProtocol,
                           deviceConfig: EiSerialDeviceConfig,
                           devKeys: { apiKey: string, hmacKey: string })
    : Promise<{ setupOK: boolean, hasWifi: boolean, didSetMgmt: boolean }> {
    if (!serial) {
        throw new Error('serial is null');
    }

    let credentials: { token?: string, askWifi?: boolean } = { };

    if (deviceConfig.wifi.connected && deviceConfig.management.connected && deviceConfig.upload.apiKey
        && deviceConfig.sampling.hmacKey
        && deviceConfig.management.url === eiConfig.endpoints.device.ws
        && deviceConfig.upload.host === eiConfig.endpoints.device.ingestion) {
        return { hasWifi: true, setupOK: true, didSetMgmt: false };
    }

    let ret = { setupOK: false, hasWifi: deviceConfig.wifi.connected, didSetMgmt: false };

    try {
        // empty mac address and AT command version >= 1.4?
        if (deviceConfig.info.id === '00:00:00:00:00:00' &&
            deviceConfig.info.atCommandVersion.major >= 1 &&
            deviceConfig.info.atCommandVersion.minor >= 4 &&
            serial) {
            let mac = await serial.getMACAddress();
            if (mac) {
                process.stdout.write('Setting device ID...');
                await serialProtocol.setDeviceID(mac);
                process.stdout.write(' OK\n');

                deviceConfig.info.id = mac;
            }
        }

        if (deviceConfig.upload.host !== eiConfig.endpoints.device.ingestion) {
            if (eiConfig.setDeviceUpload) {
                process.stdout.write('Setting upload host in device...');
                await serialProtocol.setUploadHost(eiConfig.endpoints.device.ingestion);
                process.stdout.write(' OK\n');
            }
        }

        if (eiConfig.setDeviceUpload && deviceConfig.management.url !== eiConfig.endpoints.device.ws) {
            process.stdout.write('Configuring remote management settings...');
            await serialProtocol.setRemoteManagement(eiConfig.endpoints.device.ws);
            process.stdout.write(' OK\n');
            ret.didSetMgmt = true;
        }

        if (deviceConfig.upload.apiKey !== devKeys.apiKey) {
            process.stdout.write('Configuring API key in device...');
            let uploadEndpoint = '/api/training/data';
            if (deviceConfig.upload.path !== '' && deviceConfig.upload.path !== 'b') {
                uploadEndpoint = deviceConfig.upload.path;
            }
            await serialProtocol.setUploadSettings(devKeys.apiKey || '', uploadEndpoint);
            process.stdout.write(' OK\n');
        }

        if ((!deviceConfig.sampling.hmacKey || deviceConfig.sampling.hmacKey === 'please-set-me')
            && devKeys.hmacKey) {
            process.stdout.write('Configuring HMAC key in device...');
            await serialProtocol.setSampleSettings(deviceConfig.sampling.label,
                    deviceConfig.sampling.interval, deviceConfig.sampling.length, devKeys.hmacKey);
            process.stdout.write(' OK\n');
        }

        if (!deviceConfig.wifi.connected && credentials.askWifi !== false && deviceConfig.wifi.present &&
            !setupWizardRan) {

            let inqSetup = await inquirer.prompt([{
                type: 'confirm',
                message: 'WiFi is not connected, do you want to set up a WiFi network now?',
                default: true,
                name: 'setupWifi'
            }]);
            if (inqSetup.setupWifi) {
                process.stdout.write('Scanning WiFi networks...');
                let wifi = await serialProtocol.scanWifi();
                process.stdout.write(' OK\n');

                let inqWifi = await inquirer.prompt([{
                    type: 'list',
                    choices: wifi.map(w => ({ name: w.line, value: w })),
                    message: 'Select WiFi network',
                    name: 'wifi',
                    pageSize: 20
                }]);

                let network = <EiSerialWifiNetwork>inqWifi.wifi;
                let pass = '';

                if (network.security !== EiSerialWifiSecurity.EI_SECURITY_NONE) {
                    let inqPass = <{ wifiPass: string }>await inquirer.prompt([{
                        type: 'input',
                        message: 'Enter password for network "' + network.ssid + '"',
                        name: 'wifiPass'
                    }]);
                    pass = inqPass.wifiPass;
                }

                process.stdout.write('Connecting to "' + network.ssid + '"...');
                await serialProtocol.setWifi(network.ssid, pass, network.security);
                process.stdout.write(' OK\n');

                ret.hasWifi = true;
            }
        }

        setupWizardRan = true;

        ret.setupOK = true;
    }
    catch (ex) {
        console.error('Error while setting up device', ex);
    }

    return ret;
}

function isJpeg(buffer: Buffer): boolean {
    // According to the SO threads below, we can check if the buffer is a JPEG image by checking
    // the first 2 bytes (SOI) and length (which should be at least 125 bytes)
    // eslint-disable-next-line @stylistic/max-len
    // https://stackoverflow.com/questions/5413022/is-the-2nd-and-3rd-byte-of-a-jpeg-image-always-the-app0-or-app1-marker
    // eslint-disable-next-line @stylistic/max-len
    // https://stackoverflow.com/questions/2253404/what-is-the-smallest-valid-jpeg-file-size-in-bytes
	if (!buffer || buffer.length < 125) {
		return false;
	}

	return buffer[0] === 0xff && buffer[1] === 0xd8;
}
