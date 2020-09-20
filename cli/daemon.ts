#!/usr/bin/env node

import { SerialConnector } from './serial-connector';
import fs from 'fs';
import Path from 'path';
import WebSocket from 'ws';
import EiSerialProtocol, {
    EiSerialDeviceConfig, EiSerialWifiNetwork, EiSerialWifiSecurity, EiStartSamplingResponse, EiSerialDone,
    EiSerialDoneBuffer
} from './ei-serial-protocol';
import cbor from 'cbor';
import inquirer from 'inquirer';
import request from 'request-promise';
import {
    MgmtInterfaceHelloV2, MgmtInterfaceHelloResponse,
    MgmtInterfaceSampleRequest, MgmtInterfaceSampleResponse,
    MgmtInterfaceSampleFinishedResponse,
    MgmtInterfaceSampleReadingResponse,
    MgmtInterfaceSampleUploadingResponse,
    MgmtInterfaceSampleStartedResponse,
    MgmtInterfaceSampleProcessingResponse
} from '../shared/MgmtInterfaceTypes';
import { Config, EdgeImpulseConfig } from './config';
import { findSerial } from './find-serial';
import { canFlashSerial } from './can-flash-serial';
import checkNewVersions from './check-new-version';
import { ProjectsApiApiKeys, DevicesApiApiKeys } from '../sdk/studio/api';

const TCP_PREFIX = '\x1b[32m[WS ]\x1b[0m';
const SERIAL_PREFIX = '\x1b[33m[SER]\x1b[0m';

const version = (<{ version: string }>JSON.parse(fs.readFileSync(Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;
const cleanArgv = process.argv.indexOf('--clean') > -1;
const silentArgv = process.argv.indexOf('--silent') > -1;
const devArgv = process.argv.indexOf('--dev') > -1;
const apiKeyArgvIx = process.argv.indexOf('--api-key');
const apiKeyArgv = apiKeyArgvIx !== -1 ? process.argv[apiKeyArgvIx + 1] : undefined;

const configFactory = new Config();
// tslint:disable-next-line:no-floating-promises
(async () => {
    try {
        console.log('Edge Impulse serial daemon v' + version);

        if (cleanArgv || apiKeyArgv) {
            await configFactory.clean();
        }

        try {
            await checkNewVersions(configFactory);
        }
        catch (ex) {
            /* noop */
        }

        // this verifies host settings and verifies the JWT token
        let config: EdgeImpulseConfig;
        try {
            config = await configFactory.verifyLogin(devArgv, apiKeyArgv);
        }
        catch (ex) {
            console.log('Stored token seems invalid, clearing cache...');
            await configFactory.clean();
            config = await configFactory.verifyLogin(devArgv, apiKeyArgv);
        }

        console.log('Endpoints:');
        console.log('    Websocket:', config.endpoints.internal.ws);
        console.log('    API:      ', config.endpoints.internal.api);
        console.log('    Ingestion:', config.endpoints.internal.ingestion);
        console.log('');

        let deviceId = await findSerial();
        await connectToSerial(config, deviceId, (cleanArgv || apiKeyArgv) ? true : false);
    }
    catch (ex) {
        console.error('Failed to set up serial daemon', ex);
    }
})();

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

async function connectToSerial(eiConfig: EdgeImpulseConfig, deviceId: string, clean: boolean) {
    // if this is set it means we have a connection
    let config: EiSerialDeviceConfig | undefined;
    // if this is set we have a connection to the server
    let ws: WebSocket | undefined;

    const serial = new SerialConnector(deviceId, 115200);
    const serialProtocol = new EiSerialProtocol(serial);
    serial.on('error', err => {
        console.log(SERIAL_PREFIX, 'Serial error - retrying in 5 seconds', err);
        setTimeout(serial_connect, 5000);
    });
    serial.on('close', () => {
        console.log(SERIAL_PREFIX, 'Serial closed - retrying in 5 seconds');
        if (ws) {
            ws.terminate();
        }
        setTimeout(serial_connect, 5000);
    });
    // serial.on('data', data => {
    //     console.log(SERIAL_PREFIX, 'serial data', data, data.toString('ascii'));
    //     // client.write(data);
    // });
    async function connectLogic() {
        if (!serial.is_connected()) return setTimeout(serial_connect, 5000);

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

            // we support devices with version 1.3.x and lower
            if (config.info.atCommandVersion.major > 1 || config.info.atCommandVersion.minor > 3) {
                console.error(SERIAL_PREFIX,
                    'Unsupported AT command version running on this device. Supported version is 1.3.x and lower, ' +
                    'but found ' + config.info.atCommandVersion.major + '.' + config.info.atCommandVersion.minor + '.' +
                    config.info.atCommandVersion.patch + '.');
                console.error(SERIAL_PREFIX,
                    'Update the Edge Impulse CLI tools (via `npm update edge-impulse-cli -g`) ' +
                    'to continue.');
                process.exit(1);
            }

            let setupRes = silentArgv ?
                { hasWifi: true, setupOK: true, didSetMgmt: false } :
                await setupWizard(eiConfig, serialProtocol, config);
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

            if (!ws) {
                // tslint:disable-next-line:no-floating-promises
                ws_connect();
            }
            else {
                sendHello();
            }
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

    function sendHello() {
        if (!config || !ws || !serial.is_connected()) return;

        let req: MgmtInterfaceHelloV2 = {
            hello: {
                version: 2,
                apiKey: config.upload.apiKey,
                deviceId: config.info.id,
                deviceType: config.info.type,
                connection: 'daemon',
                sensors: config.sensors
            }
        };
        ws.once('message', async (helloResponse: Buffer) => {
            let ret = <MgmtInterfaceHelloResponse>cbor.decode(helloResponse);
            if (!ret.hello) {
                console.error(TCP_PREFIX, 'Failed to authenticate, API key not correct?', ret.err);
                try {
                    if (config) {
                        await getAndConfigureProject(eiConfig, serialProtocol, config);
                        if (ws) {
                            ws.removeAllListeners();
                            ws.terminate();
                            ws = undefined;
                        }
                        console.log(TCP_PREFIX, 'Connecting in 5 seconds...');
                        // sleep a little bit (device might now connect to ws)
                        await sleep(5000);

                        await connectLogic();
                    }
                    else {
                        throw new Error('Config is empty');
                    }
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    console.error(SERIAL_PREFIX, 'Cannot set API key. Try running this application via:');
                    console.error(SERIAL_PREFIX, '\tedge-impulse-daemon --clean');
                    console.error(SERIAL_PREFIX, 'To reset any state');
                    console.error(SERIAL_PREFIX, ex.message || ex);
                }
            }
            else {
                if (!config) {
                    console.log(TCP_PREFIX, 'Authenticated');
                }
                else {
                    let info = await getProjectAndDeviceInfo(eiConfig, config);

                    // we don't have studio endpoint here, so let's rewrite it
                    let endpoint = config.management.url;
                    endpoint = endpoint.replace('ws', 'http');
                    endpoint = endpoint.replace('remote-mgmt', 'studio');
                    endpoint = endpoint.replace('4802', '4800');
                    if (endpoint.indexOf('4800') === -1) {
                        endpoint = endpoint.replace('http:', 'https:');
                    }

                    console.log(TCP_PREFIX, `Device "${info.deviceName}" is now connected to project "${info.projectName}"`);
                    console.log(TCP_PREFIX,
                        `Go to ${endpoint}/studio/${info.projectId}/acquisition/training ` +
                        `to build your machine learning model!`);
                }
            }
        });
        ws.send(cbor.encode(req));
    }

    async function serial_connect() {
        try {
            await serial.connect();
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.error(SERIAL_PREFIX, 'Failed to connect to', deviceId, 'retrying in 5 seconds', ex.message || ex);
            if (ex.message && ex.message.indexOf('Permission denied')) {
                console.error(SERIAL_PREFIX, 'You might need `sudo` or set up the right udev rules');
            }
            setTimeout(serial_connect, 5000);
        }
    }

    console.log(SERIAL_PREFIX, 'Connecting to', deviceId);

    // tslint:disable-next-line:no-floating-promises
    serial_connect();

    function attachWsHandlers() {
        if (!ws) {
            return console.log(TCP_PREFIX, 'attachWsHandlers called without ws instance!');
        }

        ws.on('message', async (data: Buffer) => {
            let d = cbor.decode(<Buffer>data);

            // hello messages are handled in sendHello()
            if (typeof (<any>d).hello !== 'undefined') return;

            if (typeof (<any>d).sample !== 'undefined') {
                let s = (<MgmtInterfaceSampleRequest>d).sample;

                console.log(TCP_PREFIX, 'Incoming sampling request', s);

                try {
                    if (!config || !config.upload.apiKey) {
                        throw new Error('Device does not have API key');
                    }

                    await serialProtocol.setSampleSettings(s.label,
                            s.interval, s.length, s.hmacKey);

                    await serialProtocol.setUploadSettings(config.upload.apiKey, s.path);
                    console.log(SERIAL_PREFIX, 'Configured upload settings');
                    let res: MgmtInterfaceSampleResponse = {
                        sample: true
                    };
                    if (ws) {
                        ws.send(cbor.encode(res));
                    }

                    console.log(SERIAL_PREFIX, 'Instructed device...');

                    function waitForSamplingDone(ee: EiStartSamplingResponse): Promise<EiSerialDone> {
                        return new Promise((resolve, reject) => {
                            ee.on('done', (ev) => resolve(ev));
                            ee.on('error', reject);
                        });
                    }

                    let sampleReq = serialProtocol.startSampling(s.sensor, s.length + 3000);

                    sampleReq.on('samplingStarted', () => {
                        let r: MgmtInterfaceSampleStartedResponse = {
                            sampleStarted: true
                        };
                        if (ws) {
                            ws.send(cbor.encode(r));
                        }
                    });

                    sampleReq.on('processing', () => {
                        let r: MgmtInterfaceSampleProcessingResponse = {
                            sampleProcessing: true
                        };
                        if (ws) {
                            ws.send(cbor.encode(r));
                        }
                    });

                    sampleReq.on('readingFromDevice', () => {
                        let r: MgmtInterfaceSampleReadingResponse = {
                            sampleReading: true
                        };
                        if (ws) {
                            ws.send(cbor.encode(r));
                        }
                    });

                    sampleReq.on('uploading', () => {
                        let r: MgmtInterfaceSampleUploadingResponse = {
                            sampleUploading: true
                        };
                        if (ws) {
                            ws.send(cbor.encode(r));
                        }
                    });

                    let deviceResponse = await waitForSamplingDone(sampleReq);

                    if (deviceResponse && deviceResponse.file) {
                        let res3: MgmtInterfaceSampleUploadingResponse = {
                            sampleUploading: true
                        };
                        if (ws) {
                            ws.send(cbor.encode(res3));
                        }

                        let url = eiConfig.endpoints.internal.ingestion + s.path;
                        try {
                            console.log(SERIAL_PREFIX, 'Uploading to', url);
                            if (deviceResponse.file &&
                                deviceResponse.file.indexOf(Buffer.from('Ref-BINARY-', 'ascii')) > -1) {

                                let dr = <EiSerialDoneBuffer>deviceResponse;
                                await request.post(url, {
                                    headers: {
                                        'x-api-key': config.upload.apiKey,
                                        'x-file-name': deviceResponse.filename,
                                        'x-label': dr.label,
                                        'Content-Type': 'application/octet-stream'
                                    },
                                    body: deviceResponse.file,
                                    encoding: 'binary'
                                });
                            }
                            else {
                                await request.post(url, {
                                    headers: {
                                        'x-api-key': config.upload.apiKey,
                                        'x-file-name': deviceResponse.filename,
                                        'Content-Type': 'application/cbor'
                                    },
                                    body: deviceResponse.file,
                                    encoding: 'binary'
                                });
                                await serialProtocol.unlink(deviceResponse.onDeviceFileName);
                            }
                            console.log(SERIAL_PREFIX, 'Uploading to', url, 'OK');
                        }
                        catch (ex2) {
                            let ex = <Error>ex2;
                            console.error(SERIAL_PREFIX, 'Failed to upload to', url, ex);
                        }
                    }

                    let res2: MgmtInterfaceSampleFinishedResponse = {
                        sampleFinished: true
                    };
                    if (ws) {
                        ws.send(cbor.encode(res2));
                    }
                    console.log(SERIAL_PREFIX, 'Sampling finished');
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    console.error(SERIAL_PREFIX, 'Failed to set sampling parameters', ex);
                    let res: MgmtInterfaceSampleResponse = {
                        sample: false,
                        error: ex.message || ex.toString()
                    };
                    if (ws) {
                        ws.send(cbor.encode(res));
                    }
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

        ws.on('error', err => {
            console.error(TCP_PREFIX, `Error connecting to ${eiConfig.endpoints.internal.ws}`, (<any>err).code || err);
        });

        ws.on('close', () => {
            console.log(TCP_PREFIX, 'Trying to connect in 1 seconds');
            setTimeout(ws_connect, 1000);
            if (ws) {
                ws.removeAllListeners();
            }
            ws = undefined;
        });

        ws.on('open', () => {
            console.log(TCP_PREFIX, `Connected to ${eiConfig.endpoints.internal.ws}`);
            sendHello();
        });
    }

    // ping-pong logic to detect disconnects
    setInterval(() => {
        let myws = ws;
        if (myws) {
            let received = false;
            // console.log(TCP_PREFIX, 'Ping');
            myws.ping();
            myws.once('pong', () => {
                received = true;
                // console.log(TCP_PREFIX, 'Pong');
            });
            setTimeout(() => {
                if (!received && ws && ws === myws) {
                    console.log(TCP_PREFIX, 'Not received pong from server within six seconds, re-connecting');
                    ws.terminate();
                }
            }, 6000);
        }
    }, 30000);

    async function ws_connect() {
        // if our connection dropped because the device is now connected over wifi
        // (only 1 device ID can connect at the same time)
        // then we don't want to reconnect naturally
        config = await serialProtocol.getConfig();
        if (config.management.connected) {
            console.log(SERIAL_PREFIX, 'Device is connected over WiFi to remote management API, ' +
                'no need to run the daemon. Exiting...');
            process.exit(1);
        }
        else {
            if (!config.upload.apiKey || !config.info.id || !config.info.type) {
                console.error(SERIAL_PREFIX, 'Cannot connect to remote management API using daemon, failed to read ' +
                    'apiKey, deviceId or deviceType from device. Restarting your development board might help. ' +
                    'Retrying in 5 seconds...');
                setTimeout(serial_connect, 5000);
                return;
            }

            console.log(SERIAL_PREFIX, 'Device is not connected to remote management API, ' +
                'will use daemon');
        }

        console.log(TCP_PREFIX, `Connecting to ${eiConfig.endpoints.internal.ws}`);
        try {
            // @todo handle reconnect?
            ws = new WebSocket(eiConfig.endpoints.internal.ws);
            attachWsHandlers();
        }
        catch (ex) {
            console.error(TCP_PREFIX, 'Failed to connect to', eiConfig.endpoints.internal.ws, ex);
            setTimeout(ws_connect, 1000);
        }
    }
}

async function getAndConfigureProject(eiConfig: EdgeImpulseConfig,
                                      serialProtocol: EiSerialProtocol,
                                      deviceConfig: EiSerialDeviceConfig) {
    let projectList = (await eiConfig.api.projects.listProjects()).body;

    if (!projectList.success) {
        throw new Error('Failed to retrieve project list... ' + projectList.error);
    }

    let projectId;
    if (!projectList.projects || projectList.projects.length === 0) {
        throw new Error('User has no projects, create one before continuing');
    }
    else if (projectList.projects && projectList.projects.length === 1) {
        projectId = projectList.projects[0].id;
    }
    else {
        let inqRes = <{ project: number }>await inquirer.prompt([{
            type: 'list',
            choices: (projectList.projects || []).map(p => ({ name: p.name, value: p.id })),
            name: 'project',
            message: 'To which project do you want to add this device?',
            pageSize: 20
        }]);
        projectId = Number(inqRes.project);
    }

    let devKeys = (await eiConfig.api.projects.listDevkeys(projectId)).body;

    if (!devKeys.apiKey) {
        throw new Error('No development API keys configured in your project... ' +
            'Go to the project dashboard to set one up.');
    }

    process.stdout.write('Configuring API key in device...');
    let uploadEndpoint = '/api/training/data';
    if (deviceConfig.upload.path !== '' && deviceConfig.upload.path !== 'b') {
        uploadEndpoint = deviceConfig.upload.path;
    }
    await serialProtocol.setUploadSettings(devKeys.apiKey || '', uploadEndpoint);
    process.stdout.write(' OK\n');

    if ((!deviceConfig.sampling.hmacKey || deviceConfig.sampling.hmacKey === 'please-set-me')
        && devKeys.hmacKey) {
        process.stdout.write('Configuring HMAC key in device...');
        await serialProtocol.setSampleSettings(deviceConfig.sampling.label,
                deviceConfig.sampling.interval, deviceConfig.sampling.length, devKeys.hmacKey);
        process.stdout.write(' OK\n');
    }

    let create = (await eiConfig.api.devices.createDevice(projectId, {
        deviceId: deviceConfig.info.id,
        deviceType: deviceConfig.info.type,
        ifNotExists: true
    })).body;
    if (!create.success) {
        throw new Error('Failed to create device... ' + create.error);
    }

    return Number(projectId);
}

let setupWizardRan = false;

async function setupWizard(eiConfig: EdgeImpulseConfig,
                           serialProtocol: EiSerialProtocol,
                           deviceConfig: EiSerialDeviceConfig)
    : Promise<{ setupOK: boolean, hasWifi: boolean, didSetMgmt: boolean }> {
    let credentials: { token?: string, askWifi?: boolean } = { };

    if (deviceConfig.wifi.connected && deviceConfig.management.connected && deviceConfig.upload.apiKey
        && deviceConfig.sampling.hmacKey
        && deviceConfig.management.url === eiConfig.endpoints.device.ws
        && deviceConfig.upload.host === eiConfig.endpoints.device.ingestion) {
        return { hasWifi: true, setupOK: true, didSetMgmt: false };
    }

    let ret = { setupOK: false, hasWifi: deviceConfig.wifi.connected, didSetMgmt: false };

    try {
        if (!deviceConfig.upload.apiKey) {
            try {
                let projectId = await getAndConfigureProject(eiConfig, serialProtocol, deviceConfig);

                let device = (await eiConfig.api.devices.getDevice(projectId, deviceConfig.info.id)).body.device;

                let currName = device ? device.name : '';

                let nameDevice = <{ nameDevice: string }>await inquirer.prompt([{
                    type: 'input',
                    message: 'What name do you want to give this device?',
                    name: 'nameDevice',
                    default: currName
                }]);
                if (nameDevice.nameDevice !== deviceConfig.info.id) {
                    let rename = (await eiConfig.api.devices.renameDevice(
                        projectId, deviceConfig.info.id, { name: nameDevice.nameDevice })).body;

                    if (!rename.success) {
                        console.error('Failed to rename device...', rename.error);
                        return ret;
                    }
                }
            }
            catch (ex2) {
                let ex = <Error>ex2;
                console.error(TCP_PREFIX, ex.message || ex);
                return ret;
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

async function getProjectAndDeviceInfo(eiConfig: EdgeImpulseConfig, config: EiSerialDeviceConfig) {
    try {
        eiConfig.api.projects.setApiKey(ProjectsApiApiKeys.ApiKeyAuthentication, config.upload.apiKey);
        eiConfig.api.devices.setApiKey(DevicesApiApiKeys.ApiKeyAuthentication, config.upload.apiKey);

        let projectBody = (await eiConfig.api.projects.listProjects()).body;
        if (!projectBody.success) {
            throw projectBody.error;
        }

        let project = (projectBody.projects || [])[0];
        if (!project) {
            throw new Error('Cannot find project, invalid API key?');
        }

        let devices = (await eiConfig.api.devices.getDevice(project.id, config.info.id)).body;
        if (!devices.success) {
            throw devices.error;
        }

        return {
            projectId: project.id,
            projectName: project.name,
            deviceName: devices.device ? devices.device.name : config.info.id
        };
    }
    catch (ex2) {
        let ex = <Error>ex2;
        throw ex.message || ex;
    }
}
