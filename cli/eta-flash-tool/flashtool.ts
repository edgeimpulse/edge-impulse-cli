#!/usr/bin/env node

import { SerialConnector } from '../serial-connector';
import fs from 'fs';
import Path from 'path';
import WebSocket from 'ws';
import EtaSerialProtocol from './eta-serial-protocol';
import { findSerial } from '../find-serial';
import crc32 from 'crc-32';
import program from 'commander';
import cliProgress from 'cli-progress';
import checkNewVersions from '../check-new-version';
import { Config } from '../config';

const SERIAL_PREFIX = '\x1b[33m[ETA]\x1b[0m';

const APP_BAUD_RATE = 115200;

const packageVersion = (<{ version: string }>JSON.parse(fs.readFileSync(
    Path.join(__dirname, '..', '..', '..', 'package.json'), 'utf-8'))).version;

program
    .description('Eta Compute ECM3532 AI Sensor flash tool')
    .version(packageVersion)
    .option('-f --firmware-path <file>', 'Firmware path (required)')
    .option('--baud-rate <n>', 'Bootloader baud rate (default: 460800)')
    .option('--serial-write-pacing', 'Enable write pacing (default: off)')
    .option('--verbose', 'Enable debug logs')
    .allowUnknownOption(true)
    .parse(process.argv);

const firmwarePathArgv: string = <string>program.firmwarePath;
const baudRateArgv: string = <string>program.baudRate;
const serialWritePacing: boolean = !!program.serialWritePacing;
const debug: boolean = !!program.verbose;

let configFactory = new Config();
// tslint:disable-next-line:no-floating-promises
(async () => {
    try {
        if (!firmwarePathArgv) {
            console.log('Missing --firmware-path argument');
            process.exit(1);
        }

        if (!fs.existsSync(firmwarePathArgv)) {
            console.log(firmwarePathArgv + ' does not exist (via --firmware-path)');
            process.exit(1);
        }

        try {
            await checkNewVersions(configFactory);
        }
        catch (ex) {
            /* noop */
        }

        let deviceId = await findSerial();
        await connectToSerial(deviceId);
    }
    catch (ex) {
        console.error('Failed to set up serial daemon', ex);
    }
})();

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

async function connectToSerial(deviceId: string) {
    const bootloaderBaudRate = baudRateArgv ? Number(baudRateArgv) : 460800;
    if (isNaN(bootloaderBaudRate)) {
        throw new Error('Baud rate is invalid (' + baudRateArgv + ', via --baud-rate)');
    }

    // if this is set we have a connection to the server
    let ws: WebSocket | undefined;

    console.log(SERIAL_PREFIX, 'Connecting to ' + deviceId + '...');
    const serial = new SerialConnector(deviceId, APP_BAUD_RATE);
    const serialProtocol = new EtaSerialProtocol(serial, serialWritePacing, debug);
    serial.on('error', (err: Error) => {
        console.log(SERIAL_PREFIX, 'Serial error - retrying in 5 seconds', err.message || err.toString());
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

        if (!await serial.hasSerial()) {
            console.log('');
            console.log('Lost connection to the device. Are you connected to the right serial port?');
            process.exit(1);
        }

        const progressBar = new cliProgress.SingleBar({ }, cliProgress.Presets.shades_classic);

        try {
            let waitForBootloaderTimeout = 60000;

            console.log(SERIAL_PREFIX, 'Connected, detecting firmware...');
            try {
                await serialProtocol.onConnected();
                await serialProtocol.rebootIntoBootloader();
                waitForBootloaderTimeout = 10000;
            }
            catch (ex2) {
                console.log(SERIAL_PREFIX, 'Press the **RESET** button on your AI Sensor');
            }

            await serialProtocol.setBaudRate(bootloaderBaudRate);
            await serialProtocol.waitForBootloader(waitForBootloaderTimeout);

            let version = await serialProtocol.getVersion();

            console.log(SERIAL_PREFIX, 'Restarted into bootloader. Device is running bootloader version ' +
                version.major + '.' + version.minor + '.' +
                version.patch);

            // we support devices with version 1.0.x and lower
            if (isNaN(version.major) || isNaN(version.minor) || version.major > 1 || version.minor > 0) {
                console.error(SERIAL_PREFIX,
                    'Unsupported bootloader version running on this device. Supported version is 1.0.x and lower, ' +
                    'but found ' + version.major + '.' + version.minor + '.' +
                    version.patch + '.');
                console.error(SERIAL_PREFIX,
                    'Update the Eta Compute Flash tool ' +
                    'to continue via `npm install -g edge-impulse-cli@latest`.');
                process.exit(1);
            }

            let firmware = await fs.promises.readFile(firmwarePathArgv || '');
            let fullHash = crc32.buf(firmware);

            let blockLength = await serialProtocol.sendAppInfo('New firmware', 'ECM3532 M3', fullHash, firmware.length);
            if (version.patch < 2) {
                blockLength = 255;
            }

            let blocks: Buffer[] = [];
            for (let ix = 0; ix < firmware.length; ix += blockLength) {
                blocks.push(firmware.slice(ix, ix + blockLength));
            }
            console.log(SERIAL_PREFIX, 'Firmware is', firmware.length, 'bytes (' + blocks.length + ' blocks)');

            await sleep(1000);

            if (!debug) {
                progressBar.start(blocks.length, 0);
            }

            let blockIx = 0;
            for (let b of blocks) {
                blockIx++;
                let currBlock = (blockIx).toString().padStart(blocks.length.toString().length, ' ');
                let currBlockHash = crc32.buf(b);
                if (debug) {
                    console.log(SERIAL_PREFIX, '[' + currBlock + '/' + blocks.length + '] ' +
                        'Sending block (hash ' + currBlockHash + ')...');
                }

                await serialProtocol.sendBlock(blockIx, b, currBlockHash);
                if (!debug) {
                    progressBar.update(blockIx);
                }
            }
            if (!debug) {
                progressBar.stop();
            }

            console.log(SERIAL_PREFIX, 'Finalizing update...');

            await serialProtocol.sendEou();

            console.log(SERIAL_PREFIX, 'Update complete, rebooting into application');

            await serialProtocol.rebootIntoApplication();

            console.log(SERIAL_PREFIX, 'Update completed');
            process.exit(0);
        }
        catch (ex) {
            console.error(SERIAL_PREFIX, 'Error during update.', ex);
            console.error(SERIAL_PREFIX, 'Is this device running the Eta Compute bootloader and did you press the **RESET** button?');
            process.exit(1);
        }
        finally {
            progressBar.stop();
        }
    }
    serial.on('connected', connectLogic);

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

    // tslint:disable-next-line:no-floating-promises
    serial_connect();
}
