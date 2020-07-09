#!/usr/bin/env node

import { SerialConnector } from './serial-connector';
import fs from 'fs';
import Path from 'path';
import WebSocket from 'ws';
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
import checkNewVersions from './check-new-version';
import crypto from 'crypto';

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
        console.log('Edge Impulse data forwarder v' + version);
        console.log('This is an experimental feature, please let us know if you run into any issues at');
        console.log('    https://forum.edgeimpulse.com');
        console.log('');

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

        let serialPath = await findSerial();
        await connectToSerial(config, serialPath, (cleanArgv || apiKeyArgv) ? true : false);
    }
    catch (ex) {
        console.error('Failed to set up serial daemon', ex);
    }
})();

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

async function connectToSerial(eiConfig: EdgeImpulseConfig, serialPath: string, clean: boolean) {
    // if this is set we have a connection to the server
    let ws: WebSocket | undefined;
    let dataForwarderConfig: {
        projectId: number,
        hmacKey: string,
        apiKey: string,
        samplingFreq: number,
        sensors: string[]
    } | undefined;

    const serial = new SerialConnector(serialPath, 115200);
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

        console.log(SERIAL_PREFIX, 'Serial is connected');

        try {
            if (!ws) {
                // tslint:disable-next-line:no-floating-promises
                ws_connect();
            }
            else {
                await sendHello();
            }
        }
        catch (ex) {
            console.error(SERIAL_PREFIX, 'Failed to get info off device', ex);
            setTimeout(connectLogic, 5000);
        }
    }
    serial.on('connected', connectLogic);

    async function sendHello() {
        if (!ws || !serial.is_connected()) return;

        let macAddress = await getDeviceId(serial);

        let fromConfig = await configFactory.getDataForwarderDevice(macAddress);
        if (!apiKeyArgv && fromConfig) {
            dataForwarderConfig = fromConfig;

            let sensorInfo = await getSensorInfo(serial);
            if (Math.abs(sensorInfo.samplingFreq - dataForwarderConfig.samplingFreq) > 10) {
                console.log(SERIAL_PREFIX, 'Sampling frequency seems to have changed (was ' +
                    dataForwarderConfig.samplingFreq + 'Hz, but is now ' +
                    sensorInfo.samplingFreq + 'Hz), re-configuring device.');
                dataForwarderConfig = undefined;
            }
            else if (sensorInfo.sensorCount !== dataForwarderConfig.sensors.length) {
                console.log(SERIAL_PREFIX, 'Sensor count has changed (was ' +
                    dataForwarderConfig.sensors.length + ', and now is ' +
                    sensorInfo.sensorCount + '), re-configuring device.');
                dataForwarderConfig = undefined;
            }
        }

        if (!dataForwarderConfig) {
            let a = await getAndConfigureProject(eiConfig, serial);
            dataForwarderConfig = a;
            await configFactory.storeDataForwarderDevice(macAddress, a);
        }

        let req: MgmtInterfaceHelloV2 = {
            hello: {
                version: 2,
                apiKey: dataForwarderConfig.apiKey,
                deviceId: macAddress,
                deviceType: 'DATA_FORWARDER',
                connection: 'daemon',
                sensors: [{
                    name: 'Sensor with ' + dataForwarderConfig.sensors.length +
                        ' axes (' + dataForwarderConfig.sensors.join(', ') + ')',
                    maxSampleLengthS: 5 * 60 * 1000,
                    frequencies: [ dataForwarderConfig.samplingFreq ]
                }],
            }
        };
        ws.once('message', async (helloResponse: Buffer) => {
            let ret = <MgmtInterfaceHelloResponse>cbor.decode(helloResponse);
            if (!ret.hello) {
                console.error(TCP_PREFIX, 'Failed to authenticate, API key not correct?', ret.err);
                try {
                    await getAndConfigureProject(eiConfig, serial);
                    if (ws) {
                        ws.removeAllListeners();
                        ws.terminate();
                        ws = undefined;
                    }
                    console.log(TCP_PREFIX, 'Connecting in 1 second...');
                    // sleep a little bit (device might now connect to ws)
                    await sleep(1000);

                    await connectLogic();
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    console.error(SERIAL_PREFIX, 'Cannot set API key. Try running this application via:');
                    console.error(SERIAL_PREFIX, '\tedge-impulse-data-forwarder --clean');
                    console.error(SERIAL_PREFIX, 'To reset any state');
                    console.error(SERIAL_PREFIX, ex.message || ex);
                }
            }
            else {
                if (!macAddress) {
                    throw new Error('Could not read serial number for device');
                }
                if (!dataForwarderConfig) {
                    throw new Error('No data forwarder config found');
                }
                await checkName(eiConfig, dataForwarderConfig.projectId, macAddress);

                console.log(TCP_PREFIX, 'Authenticated');
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
            console.error(SERIAL_PREFIX, 'Failed to connect to', serialPath, 'retrying in 5 seconds', ex.message || ex);
            if (ex.message && ex.message.indexOf('Permission denied')) {
                console.error(SERIAL_PREFIX, 'You might need `sudo` or set up the right udev rules');
            }
            setTimeout(serial_connect, 5000);
        }
    }

    console.log(SERIAL_PREFIX, 'Connecting to', serialPath);

    // tslint:disable-next-line:no-floating-promises
    serial_connect();

    function attachWsHandlers() {
        if (!ws) {
            return console.log(TCP_PREFIX, 'attachWsHandlers called without ws instance!');
        }

        ws.on('message', async (data: Buffer) => {
            let d = cbor.decode(data);

            // hello messages are handled in sendHello()
            if (typeof (<any>d).hello !== 'undefined') return;

            if (typeof (<any>d).sample !== 'undefined') {
                let s = (<MgmtInterfaceSampleRequest>d).sample;

                console.log(TCP_PREFIX, 'Incoming sampling request', s);

                try {
                    if (!dataForwarderConfig) {
                        let res4: MgmtInterfaceSampleResponse = {
                            sample: false,
                            error: 'dataForwarderConfig is null'
                        };
                        if (ws) {
                            ws.send(cbor.encode(res4));
                        }
                        return;
                    }

                    let res: MgmtInterfaceSampleResponse = {
                        sample: true
                    };
                    if (ws) {
                        ws.send(cbor.encode(res));
                    }

                    console.log(SERIAL_PREFIX, 'Waiting 2 seconds...');

                    await sleep(2000);

                    let res2: MgmtInterfaceSampleStartedResponse = {
                        sampleStarted: true
                    };
                    if (ws) {
                        ws.send(cbor.encode(res2));
                    }

                    console.log(SERIAL_PREFIX, 'Reading data from device...');

                    let allDataBuffers: Buffer[] = [];
                    const onData = (db: Buffer) => allDataBuffers.push(db);
                    serial.on('data', onData);

                    await sleep(s.length + 100);

                    serial.off('data', onData);

                    let dataBuffer = Buffer.concat(allDataBuffers);
                    let lines = dataBuffer.toString('ascii').split('\n').map(n => n.trim()).map(n => {
                        return n.split(/[,\t]/).map(x => Number(x.trim()));
                    });
                    // skip over the first item
                    let values = lines.slice(1, (dataForwarderConfig.samplingFreq * (s.length / 1000) + 1));

                    // if the length of the last item is not correct, remove it
                    // https://forum.edgeimpulse.com/t/edge-impulse-data-forwarder-error/351/4
                    let lastItem = values[values.length - 1];
                    if (lastItem && lastItem.length !== dataForwarderConfig.sensors.length) {
                        values = values.slice(0, values.length - 1);
                    }

                    if (!values.every(v => {
                        return dataForwarderConfig &&
                            v.every(w => !isNaN(w)) &&
                            v.length === dataForwarderConfig.sensors.length;
                    })) {
                        console.log(SERIAL_PREFIX,
                            'Invalid data collected. All values should be numeric, and every line should have ' +
                                dataForwarderConfig.sensors.length + ' values.',
                                values);

                        throw new Error('Invalid data collected from device, see data forwarder logs');
                    }

                    console.log(SERIAL_PREFIX, 'Reading data from device OK (' + values.length + ' samples at ' +
                        dataForwarderConfig.samplingFreq + 'Hz)');

                    // empty signature (all zeros). HS256 gives 32 byte signature, and we encode in hex,
                    // so we need 64 characters here
                    let emptySignature = Array(64).fill('0').join('');

                    let ingestionPayload = {
                        protected: {
                            ver: "v1",
                            alg: "HS256",
                            iat: Math.floor(Date.now() / 1000) // epoch time, seconds since 1970
                        },
                        signature: emptySignature,
                        payload: {
                            device_name: await getDeviceId(serial),
                            device_type: 'DATA_FORWARDER',
                            interval_ms: 1000 / dataForwarderConfig.samplingFreq,
                            sensors: dataForwarderConfig.sensors.map(z => {
                                return { name: z, units: z.startsWith('acc') ? 'm/s2' : 'N/A' };
                            }),
                            values: values
                        }
                    };

                    let encoded = JSON.stringify(ingestionPayload);
                    // now calculate the HMAC and fill in the signature
                    let hmac = crypto.createHmac('sha256', dataForwarderConfig.hmacKey);
                    hmac.update(encoded);
                    let signature = hmac.digest().toString('hex');

                    // update the signature in the message and re-encode
                    ingestionPayload.signature = signature;
                    encoded = JSON.stringify(ingestionPayload);

                    console.log(SERIAL_PREFIX, 'Uploading sample to', eiConfig.endpoints.internal.ingestion + s.path + '...');

                    let res5: MgmtInterfaceSampleUploadingResponse = {
                        sampleUploading: true
                    };
                    if (ws) {
                        ws.send(cbor.encode(res5));
                    }

                    await request.post(eiConfig.endpoints.internal.ingestion + s.path, {
                        headers: {
                            'x-api-key': dataForwarderConfig.apiKey,
                            'x-file-name': s.label + '.json',
                            'x-label': s.label,
                            'Content-Type': 'application/json'
                        },
                        body: encoded,
                        encoding: 'binary'
                    });

                    let res3: MgmtInterfaceSampleFinishedResponse = {
                        sampleFinished: true
                    };
                    if (ws) {
                        ws.send(cbor.encode(res3));
                    }

                    console.log(SERIAL_PREFIX, 'Sampling finished');
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    console.error(SERIAL_PREFIX, 'Failed to sample data', ex);
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

        ws.on('open', async () => {
            console.log(TCP_PREFIX, `Connected to ${eiConfig.endpoints.internal.ws}`);

            try {
                await sendHello();
            }
            catch (ex2) {
                let ex = <Error>ex2;
                console.error(SERIAL_PREFIX, 'Failed to get information off device', ex.message || ex.toString());
                setTimeout(sendHello, 5000);
            }
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

async function getAndConfigureProject(eiConfig: EdgeImpulseConfig, serial: SerialConnector) {
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
        projectId = inqRes.project;
    }

    let devKeys = (await eiConfig.api.projects.listDevkeys(projectId)).body;

    if (!devKeys.apiKey) {
        throw new Error('No development API keys configured in your project... ' +
            'Go to the project dashboard to set one up.');
    }

    // check what the sampling freq is for this device and how many sensors there are?
    let sensorInfo = await getSensorInfo(serial);

    let axes = '';
    while (axes.split(',').filter(f => !!f).length !== sensorInfo.sensorCount) {
        axes = (<{ axes: string }>(await inquirer.prompt([{
            type: 'input',
            message: sensorInfo.sensorCount + ' sensor axes detected. What do you want to call them? ' +
                'Separate the names with \',\':',
            name: 'axes'
        }]))).axes;

        if (axes.split(',').length !== sensorInfo.sensorCount) {
            console.log('Invalid input. Got ' + (axes.split(',').length) + ' axes (' +
                axes.split(',').map(n => n.trim()) + '), but expected ' +
                sensorInfo.sensorCount);
        }
    }

    return {
        projectId: Number(projectId),
        apiKey: devKeys.apiKey,
        hmacKey: devKeys.hmacKey || '0000',
        samplingFreq: sensorInfo.samplingFreq,
        sensors: axes.split(',').map(n => n.trim())
    };
}

async function checkName(eiConfig: EdgeImpulseConfig, projectId: number, deviceId: string) {
    try {
        let device = (await eiConfig.api.devices.getDevice(projectId, deviceId)).body.device;

        let currName = device ? device.name : deviceId;
        if (currName !== deviceId) return;

        let nameDevice = <{ nameDevice: string }>await inquirer.prompt([{
            type: 'input',
            message: 'What name do you want to give this device?',
            name: 'nameDevice',
            default: currName
        }]);
        if (nameDevice.nameDevice !== currName) {
            let rename = (await eiConfig.api.devices.renameDevice(
                projectId, deviceId, { name: nameDevice.nameDevice })).body;

            if (!rename.success) {
                throw new Error('Failed to rename device... ' + rename.error);
            }
        }
    }
    catch (ex2) {
        let ex = <Error>ex2;
        throw ex.message || ex;
    }
}

async function getSensorInfo(serial: SerialConnector) {
    const dataBuffers: Buffer[] = [];
    const onData = (b: Buffer) => dataBuffers.push(b);
    serial.on('data', onData);
    await sleep(500);
    serial.off('data', onData);

    const data = Buffer.concat(dataBuffers);
    let lines = data.toString('utf-8').split('\n').map(d => d.trim());

    let l = lines[1]; // we take 1 here because 0 could have been truncated
    if (!l) {
        throw new Error('No valid sensor readings received from device: ' +
            lines.join('\n'));
    }
    let sensorCount = l.split(/[,\t]/).length;

    return {
        samplingFreq: lines.length * 2,
        sensorCount: sensorCount
    };
}

async function getDeviceId(serial: SerialConnector) {
    let macAddress = await serial.getMACAddress();
    if (!macAddress) {
        throw new Error('Could not read serial number for device');
    }

    macAddress = macAddress.split(/(..)/).filter(f => !!f).join(':');
    return macAddress;
}