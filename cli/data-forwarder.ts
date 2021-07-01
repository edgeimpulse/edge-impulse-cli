#!/usr/bin/env node

import { SerialConnector } from './serial-connector';
import WebSocket from 'ws';
import cbor from 'cbor';
import inquirer from 'inquirer';
import request from 'request-promise';
import {
    MgmtInterfaceHelloV3, MgmtInterfaceHelloResponse,
    MgmtInterfaceSampleRequest, MgmtInterfaceSampleResponse,
    MgmtInterfaceSampleFinishedResponse,
    MgmtInterfaceSampleUploadingResponse,
    MgmtInterfaceSampleStartedResponse,
} from '../shared/MgmtInterfaceTypes';
import { Config, EdgeImpulseConfig } from './config';
import { findSerial } from './find-serial';
import crypto from 'crypto';
import { getCliVersion, initCliApp, setupCliApp } from './init-cli-app';

const TCP_PREFIX = '\x1b[32m[WS ]\x1b[0m';
const SERIAL_PREFIX = '\x1b[33m[SER]\x1b[0m';

const versionArgv = process.argv.indexOf('--version') > -1;
const cleanArgv = process.argv.indexOf('--clean') > -1;
const silentArgv = process.argv.indexOf('--silent') > -1;
const devArgv = process.argv.indexOf('--dev') > -1;
const apiKeyArgvIx = process.argv.indexOf('--api-key');
const apiKeyArgv = apiKeyArgvIx !== -1 ? process.argv[apiKeyArgvIx + 1] : undefined;
const frequencyArgvIx = process.argv.indexOf('--frequency');
const frequencyArgv = frequencyArgvIx !== -1 ? Number(process.argv[frequencyArgvIx + 1]) : undefined;
const baudRateArgvIx = process.argv.indexOf('--baud-rate');
const baudRateArgv = baudRateArgvIx !== -1 ? process.argv[baudRateArgvIx + 1] : undefined;

const cliOptions = {
    appName: 'Edge Impulse data forwarder',
    apiKeyArgv: apiKeyArgv,
    cleanArgv: cleanArgv,
    devArgv: devArgv,
    hmacKeyArgv: undefined,
    silentArgv: silentArgv,
    connectProjectMsg: 'To which project do you want to connect this device?',
    getProjectFromConfig: async (deviceId: string | undefined) => {
        if (!deviceId) return undefined;
        return await configFactory.getDataForwarderDevice(deviceId);
    }
};

let configFactory: Config;
// tslint:disable-next-line:no-floating-promises
(async () => {
    try {
        if (versionArgv) {
            console.log(getCliVersion());
            process.exit(0);
        }

        const initRes = await initCliApp(cliOptions);
        configFactory = initRes.configFactory;
        const config = initRes.config;

        if (typeof frequencyArgv === 'number' && isNaN(frequencyArgv)) {
            console.log('Invalid value for --frequency (should be a number)');
            process.exit(1);
        }

        let baudRate = baudRateArgv ? Number(baudRateArgv) : 115200;
        if (isNaN(baudRate)) {
            console.error('Invalid value for --baud-rate (should be a number)');
            process.exit(1);
        }

        console.log('Endpoints:');
        console.log('    Websocket:', config.endpoints.internal.ws);
        console.log('    API:      ', config.endpoints.internal.api);
        console.log('    Ingestion:', config.endpoints.internal.ingestion);
        console.log('');

        let serialPath = await findSerial();
        await connectToSerial(config, serialPath, baudRate, (cleanArgv || apiKeyArgv) ? true : false);
    }
    catch (ex) {
        console.error('Failed to set up serial daemon', ex);
    }
})();

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

async function connectToSerial(eiConfig: EdgeImpulseConfig, serialPath: string, baudRate: number, clean: boolean) {
    // if this is set we have a connection to the server
    let ws: WebSocket | undefined;
    let dataForwarderConfig: {
        projectId: number,
        hmacKey: string,
        apiKey: string,
        samplingFreq: number,
        sensors: string[]
    } | undefined;

    const serial = new SerialConnector(serialPath, baudRate);
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
        if (!serial.isConnected()) return setTimeout(serial_connect, 5000);

        let deviceId = await getDeviceId(serial);

        console.log(SERIAL_PREFIX, 'Serial is connected (' + deviceId + ')');

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
        if (!ws || !serial.isConnected()) return;

        let macAddress = await getDeviceId(serial);

        let fromConfig = await configFactory.getDataForwarderDevice(macAddress);
        if (!apiKeyArgv && fromConfig) {
            dataForwarderConfig = fromConfig;

            let sensorInfo = await getSensorInfo(serial, frequencyArgv);
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
            else if (sensorInfo.samplingFreq !== dataForwarderConfig.samplingFreq && !frequencyArgv) {
                console.log(SERIAL_PREFIX, 'Using last stored frequency (' + dataForwarderConfig.samplingFreq + 'Hz) ' +
                    'for dataset consistency. Run with --clean to reset this.');
            }
        }

        if (!dataForwarderConfig) {
            let a = await getAndConfigureProject(eiConfig, serial);
            dataForwarderConfig = a;
            await configFactory.storeDataForwarderDevice(macAddress, a);
        }

        if (frequencyArgv) {
            console.log(SERIAL_PREFIX, 'Overriding frequency to ' + frequencyArgv + 'Hz (via --frequency)');
            dataForwarderConfig.samplingFreq = frequencyArgv;
        }

        let req: MgmtInterfaceHelloV3 = {
            hello: {
                version: 3,
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
                supportsSnapshotStreaming: false
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
                let name = await checkName(eiConfig, dataForwarderConfig.projectId, macAddress);

                console.log(TCP_PREFIX, 'Device "' + name + '" is now connected to project ' +
                    '"' + (await getProjectName(eiConfig, dataForwarderConfig.projectId)) + '"');
                console.log(TCP_PREFIX,
                    `Go to ${eiConfig.endpoints.internal.api.replace('/v1', '')}/studio/${dataForwarderConfig.projectId}/acquisition/training ` +
                    `to build your machine learning model!`);
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
                        return n.split(/[,\t\s]/).filter(f => !!f.trim()).map(x => Number(x.trim()));
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
                process.exit(1);
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
    const { projectId, devKeys } = await setupCliApp(configFactory, eiConfig, cliOptions,
        (await serial.getMACAddress()) || undefined);

    // check what the sampling freq is for this device and how many sensors there are?
    let sensorInfo = await getSensorInfo(serial, frequencyArgv);

    let axes = '';
    while (axes.split(',').filter(f => !!f.trim()).length !== sensorInfo.sensorCount) {
        axes = (<{ axes: string }>(await inquirer.prompt([{
            type: 'input',
            message: sensorInfo.sensorCount + ' sensor axes detected (example values: ' +
                JSON.stringify(sensorInfo.example) + '). ' +
                'What do you want to call them? ' +
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
        if (currName !== deviceId) return currName;

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
        return nameDevice.nameDevice;
    }
    catch (ex2) {
        let ex = <Error>ex2;
        throw ex.message || ex;
    }
}

async function getProjectName(eiConfig: EdgeImpulseConfig, projectId: number) {
    try {
        let projectBody = (await eiConfig.api.projects.getProjectInfo(projectId)).body;
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

async function getSensorInfo(serial: SerialConnector, desiredFrequency: number | undefined) {
    const dataBuffers: Buffer[] = [];
    const onData = (b: Buffer) => dataBuffers.push(b);

    console.log(SERIAL_PREFIX, 'Detecting data frequency...');

    let sleepTime = typeof desiredFrequency === 'undefined' ?
        1000 :
        (1000 / desiredFrequency) * 2.5;
    if (sleepTime < 1000) {
        sleepTime = 1000;
    }

    serial.on('data', onData);
    await sleep(sleepTime);
    serial.off('data', onData);

    const data = Buffer.concat(dataBuffers);
    let lines = data.toString('utf-8').split('\n').map(d => d.trim()).filter(d => d.length);

    let l = lines[1]; // we take 1 here because 0 could have been truncated
    if (!l) {
        lines = lines.filter(x => !!x);

        l = lines[0] || '';

        let v = l.split(/[,\t\s]/).filter(f => !!f.trim());
        if (v.length > 0 && v.every(x => !isNaN(Number(x))) && typeof desiredFrequency === 'undefined') {
            throw new Error('Could not detect frequency, only a single reading received in 1 second, ' +
                'the data forwarder can only auto-detect frequencies >2Hz. ' +
                'You can override the frequency via --frequency.');
        }

        throw new Error('No valid sensor readings received from device' +
            (lines.length > 0 ? ': ' + lines.join('\n') : '') + '. ' +
            'Note that the data forwarder can only auto-detect frequencies >2Hz. ' +
            'You can override the frequency via --frequency.');
    }

    let values = l.split(/[,\t\s]/).filter(f => !!f.trim());
    if (values.some(v => isNaN(Number(v)))) {
        throw new Error('Sensor readings from device do not seem to be all numbers, found: ' +
            JSON.stringify(values));
    }

    let detectedFreq = (lines.length / sleepTime) * 1000;

    console.log(SERIAL_PREFIX, 'Detected data frequency:', detectedFreq + 'Hz');

    let sensorCount = values.length;

    return {
        samplingFreq: detectedFreq,
        sensorCount: sensorCount,
        example: values.map(n => Number(n))
    };
}

async function getDeviceId(serial: SerialConnector) {
    let macAddress = await serial.getMACAddress();
    if (!macAddress) {
        console.warn(SERIAL_PREFIX, 'Could not read serial number for device, defaulting to 000000000000');
        macAddress = '000000000000';
    }

    macAddress = macAddress.split(/(..)/).filter(f => !!f).join(':');
    return macAddress;
}
