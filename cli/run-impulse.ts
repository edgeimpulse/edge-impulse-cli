#!/usr/bin/env node

import { SerialConnector } from './serial-connector';
import fs from 'fs';
import Path from 'path';
import EiSerialProtocol, {
    EiSerialDeviceConfig, EiSerialSensor
} from '../shared/daemon/ei-serial-protocol';
import { Config } from './config';
import { findSerial } from './find-serial';
import checkNewVersions from './check-new-version';
import { getCliVersion } from './init-cli-app';
import express = require('express');
import http from 'http';
import socketIO from 'socket.io';
import { ips } from './get-ips';

const SERIAL_PREFIX = '\x1b[33m[SER]\x1b[0m';

const versionArgv = process.argv.indexOf('--version') > -1;
const version = (<{ version: string }>JSON.parse(fs.readFileSync(Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;
const debugArgv = process.argv.indexOf('--debug') > -1;
const continuousArgv = process.argv.indexOf('--continuous') > -1;
const rawArgv = process.argv.indexOf('--raw') > -1;
const whichDeviceArgvIx = process.argv.indexOf('--which-device');
const whichDeviceArgv = whichDeviceArgvIx !== -1 ? Number(process.argv[whichDeviceArgvIx + 1]) : undefined;

let stdinAttached = false;
let serial: SerialConnector | undefined;
let startedWebserver = false;
let inferenceStarted = false;

const configFactory = new Config();
// tslint:disable-next-line:no-floating-promises
(async () => {
    try {
        if (versionArgv) {
            console.log(getCliVersion());
            process.exit(0);
        }

        console.log('Edge Impulse impulse runner v' + version);

        try {
            await checkNewVersions(configFactory);
        }
        catch (ex) {
            /* noop */
        }

        if (rawArgv && (debugArgv || continuousArgv)) {
            console.log('Cannot use --raw while also declaring --debug or --continuous');
            process.exit(1);
        }

        if (debugArgv && continuousArgv) {
            console.log('Cannot combine both --debug and --continuous');
            process.exit(1);
        }

        let deviceId = await findSerial(whichDeviceArgv);
        await connectToSerial(deviceId);
    }
    catch (ex) {
        console.error('Failed to set up serial daemon', ex);
    }
})();

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

function onStdIn(data: Buffer) {
    if (!serial) return;

    // tslint:disable-next-line: no-floating-promises
    serial.write(Buffer.from(data.toString('ascii').trim() + '\r\n', 'ascii'));
}

async function connectToSerial(deviceId: string) {
    // if this is set it means we have a connection
    let config: EiSerialDeviceConfig | undefined;

    serial = new SerialConnector(deviceId, 115200);
    const serialProtocol = new EiSerialProtocol(serial);
    serial.on('error', err => {
        console.log(SERIAL_PREFIX, 'Serial error - retrying in 5 seconds', err);
        setTimeout(serial_connect, 5000);
    });
    serial.on('close', () => {
        console.log(SERIAL_PREFIX, 'Serial closed - retrying in 5 seconds');
        setTimeout(serial_connect, 5000);
    });

    let firstExit = true;

    const onSignal = async () => {
        if (!firstExit || !inferenceStarted) {
            process.exit(1);
        }
        else {
            console.log(SERIAL_PREFIX, 'Received stop signal, trying to stop inferencing... ' +
                'Press CTRL+C again to force quit.');
            inferenceStarted = false;
            firstExit = false;
            try {
                await serialProtocol.stopInference();
            }
            catch (ex2) {
                let ex = <Error>ex2;
                console.log(SERIAL_PREFIX, 'Failed to stop inferencing', ex.message);
            }
            process.exit(1);
        }
    };

    process.on('SIGHUP', onSignal);
    process.on('SIGINT', onSignal);

    let logMessages = true;

    serial.on('data', data => {
        if (((serial && serial.isConnected() && inferenceStarted) || rawArgv) && logMessages) {
            process.stdout.write(data.toString('ascii'));
        }
    });
    async function connectLogic() {
        if (serial && !serial.isConnected()) {
            inferenceStarted = false;
            return setTimeout(serial_connect, 5000);
        }

        if (rawArgv) {
            process.stdin.resume();
            if (!stdinAttached) {
                process.stdin.on('data', onStdIn);
                stdinAttached = true;
            }

            console.log(SERIAL_PREFIX, 'Connected to', deviceId);
            return;
        }

        config = undefined;
        console.log(SERIAL_PREFIX, 'Serial is connected, trying to read config...');

        try {
            await serialProtocol.onConnected();

            config = await serialProtocol.getConfig();

            console.log(SERIAL_PREFIX, 'Retrieved configuration');
            console.log(SERIAL_PREFIX, 'Device is running AT command version ' +
                config.info.atCommandVersion.major + '.' + config.info.atCommandVersion.minor + '.' +
                config.info.atCommandVersion.patch);

            // we support devices with version 1.6.x and lower
            if (config.info.atCommandVersion.major > 1 || config.info.atCommandVersion.minor > 6) {
                console.error(SERIAL_PREFIX,
                    'Unsupported AT command version running on this device. Supported version is 1.6.x and lower, ' +
                    'but found ' + config.info.atCommandVersion.major + '.' + config.info.atCommandVersion.minor + '.' +
                    config.info.atCommandVersion.patch + '.');
                console.error(SERIAL_PREFIX,
                    'Update the Edge Impulse CLI tools (via `npm update edge-impulse-cli -g`) ' +
                    'to continue.');
                process.exit(1);
            }

            let mode: 'normal' | 'continuous' | 'debug' = 'normal';
            if (continuousArgv) {
                mode = 'continuous';
            }
            else if (debugArgv) {
                mode = 'debug';
            }

            if (config.inference.sensor === EiSerialSensor.EI_CLASSIFIER_SENSOR_CAMERA) {
                if (mode !== 'debug') {
                    console.log('');
                    console.log(SERIAL_PREFIX,
                        'To get a live feed of the camera and live classification in your browser, run with --debug');
                    console.log('');
                }
                else {
                    let webserverPort = await startWebServer(config);
                    console.log('');
                    console.log('Want to see a feed of the camera and live classification in your browser? ' +
                        'Go to http://' + (ips.length > 0 ? ips[0].address : 'localhost') + ':' + webserverPort);
                    console.log('');
                    logMessages = false;
                }
            }

            await serialProtocol.startInference(mode);

            console.log(SERIAL_PREFIX, 'Started inferencing, press CTRL+C to stop...');

            inferenceStarted = true;
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.error(SERIAL_PREFIX, 'Failed to get info off device:' + ex.message + '. ' +
                'Is this device running a binary built through Edge Impulse? Reconnecting in 5 seconds...');
            setTimeout(connectLogic, 5000);
        }
    }
    serial.on('connected', connectLogic);

    async function serial_connect() {
        if (!serial) return;

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
}

async function startWebServer(config: EiSerialDeviceConfig) {
    if (!serial) return;
    if (startedWebserver) return;

    startedWebserver = true;

    const app = express();
    app.use(express.static(Path.join(__dirname, '..', '..', 'public')));

    const server = new http.Server(app);
    const io = socketIO(server);

    server.listen(Number(process.env.PORT) || 4915, process.env.HOST || '0.0.0.0', async () => {
        // noop
    });

    let currentMsg: string | undefined;
    serial.on('data', (data: Buffer) => {
        let s = data.toString('utf-8');
        if (s.indexOf('End output') > -1) {
            if (typeof currentMsg === 'string') {
                currentMsg += s.substr(0, s.indexOf('End output'));

                let lines = currentMsg.split('\n');
                let fb = lines.find(x => x.startsWith('Framebuffer: '));

                let printMsg = '';

                let classifyTime = 0;
                let timingLine = lines.find(x => x.startsWith('Predictions'));
                if (timingLine) {
                    let m = timingLine.match(/Classification: (\d+)/);
                    if (m) {
                        classifyTime = Number(m[1]);
                    }
                    printMsg += timingLine + '\n';
                }

                if (fb) {
                    fb = fb.replace('Framebuffer: ', '').trim();

                    let snapshot = Buffer.from(fb, 'base64');
                    io.emit('image', {
                        img: 'data:image/jpeg;base64,' + snapshot.toString('base64')
                    });
                }

                let mode: 'classification' | 'object_detection';
                let firstClassifyLine = lines.find(x => x.startsWith('    '));
                if (firstClassifyLine && !isNaN(Number(firstClassifyLine.split(':')[1]))) {
                    mode = 'classification';
                }
                else {
                    mode = 'object_detection';
                }

                if (mode === 'object_detection') {
                    let cubes = [];
                    // parse object detection
                    for (let l of lines.filter(x => x.startsWith('    ') && x.indexOf('width:') > -1)) {
                        let m = l.trim()
                            .match(/^(\w+) \(([\w\.]+)\) \[ x: (\d+), y: (\d+), width: (\d+), height: (\d+)/);
                        if (!m) continue;
                        let cube = {
                            label: m[1],
                            value: Number(m[2]),
                            x: Number(m[3]),
                            y: Number(m[4]),
                            width: Number(m[5]),
                            height: Number(m[6]),
                        };
                        cubes.push(cube);
                        printMsg += l + '\n';
                    }

                    io.emit('classification', {
                        result: {
                            bounding_boxes: cubes
                        },
                        timeMs: classifyTime,
                    });
                }
                else {
                    let results: { [k: string]: number } = { };
                    // parse object detection
                    for (let l of lines.filter(x => x.startsWith('    '))) {
                        let m = l.split(':').map(x => x.trim());
                        if (m.length !== 2) continue;
                        results[m[0]] = Number(m[1]);
                        printMsg += l + '\n';
                    }

                    io.emit('classification', {
                        result: {
                            classification: results
                        },
                        timeMs: classifyTime,
                    });
                }

                if (inferenceStarted) {
                    console.log(printMsg.trim());
                }
            }

            currentMsg = undefined;
            s = s.substr(s.indexOf('End output'));
        }

        if (s.indexOf('Begin output') > -1) {
            s = s.substr(s.indexOf('Begin output') + 'Begin output'.length);
            currentMsg = s;
            return;
        }

        if (currentMsg) {
            currentMsg += s;
        }

        // console.log('data', data.toString('utf-8');
    });

    io.on('connection', socket => {
        socket.emit('hello', {
            projectName: 'Live classification on ' + config.info.type
        });
    });

    return Number(process.env.PORT) || 4915;
}
