#!/usr/bin/env node

import { SerialConnector } from '../serial-connector';
import fs from 'fs';
import Path from 'path';
import WebSocket from 'ws';
import { HimaxSerialProtocol, HimaxDeviceTypes } from './himax-serial-protocol';
import { findSerial } from '../find-serial';
import crc32 from 'crc-32';
import program from 'commander';
import cliProgress from 'cli-progress';
import checkNewVersions from '../../cli-common/check-new-version';
import { Config } from '../../cli-common/config';
import { Xmodem } from './xmodem';

const SERIAL_PREFIX = '\x1b[33m[HMX]\x1b[0m';

const defaultBaudRates: { [key in HimaxDeviceTypes]: number } = {
    [HimaxDeviceTypes.WEIPlus]: 115200,
    [HimaxDeviceTypes.WiseEye2]: 921600
};
const packageVersion = (<{ version: string }>JSON.parse(fs.readFileSync(
    Path.join(__dirname, '..', '..', '..', 'package.json'), 'utf-8'))).version;

program
    .description('Himax WE-I and WiseEye2 flash tool')
    .version(packageVersion)
    .option('-f --firmware-path <file>', 'Firmware path (required)')
    .option('-d --device <device>', 'Device type: "WE-I-Plus" (default) or "WiseEye2"')
    .option('--baud-rate <n>', 'Bootloader baud rate (default: 115200 for WE-I-Plus and 921600 for WiseEye2)')
    .option('--skip-reset', 'Skip the reset procedure (in case the device is already in bootloader mode)')
    .option('--verbose', 'Enable debug logs')
    .allowUnknownOption(true)
    .parse(process.argv);

const firmwarePathArgv: string = <string>program.firmwarePath;
const baudRateArgv: string = <string>program.baudRate;
const serialWritePacing: boolean = !!program.serialWritePacing;
const debug: boolean = !!program.verbose;
const skipReset: boolean = !!program.skipReset;
const deviceTypeArg: string = <string>program.device || 'WE-I-Plus';

let configFactory = new Config();
// eslint-disable-next-line @typescript-eslint/no-floating-promises
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

        let deviceId = await findSerial(undefined);
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
    let bootloaderBaudRate: number | undefined;
    let deviceType: HimaxDeviceTypes;

    try {
        deviceType = deviceTypeArg as HimaxDeviceTypes;
        bootloaderBaudRate = defaultBaudRates[deviceType];
    }
    catch (ex) {
        throw new Error('Unknown device type ' + deviceTypeArg);
    }

    // override the default baud rate if the user specified one
    if (baudRateArgv) {
        bootloaderBaudRate = Number(baudRateArgv);
        if (!bootloaderBaudRate) {
            throw new Error('Baud rate is invalid (' + baudRateArgv + ', via --baud-rate)');
        }
    }

    if (!bootloaderBaudRate) {
        throw new Error('Unknown baud rate ' + bootloaderBaudRate);
    }

    if (isNaN(bootloaderBaudRate)) {
        throw new Error('Baud rate is invalid (' + baudRateArgv + ', via --baud-rate)');
    }

    // if this is set we have a connection to the server
    let ws: WebSocket | undefined;

    console.log(SERIAL_PREFIX, 'Connecting to ' + deviceId + '...');
    const serial = new SerialConnector(deviceId, bootloaderBaudRate);
    const serialProtocol = new HimaxSerialProtocol(serial, serialWritePacing, deviceType, debug);
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
            if (deviceType === HimaxDeviceTypes.WEIPlus) {
                console.log(SERIAL_PREFIX, 'Connected, press the **RESET** button on your Himax WE-I now');
            }
            else if(deviceType === HimaxDeviceTypes.WiseEye2) {
                console.log(SERIAL_PREFIX, 'Connected, press the **RESET** button on your Seeed Grove Vision AI Module V2 now');
            }
            else {
                console.log(SERIAL_PREFIX, 'Connected, press the **RESET** button on your Himax device now');
            }
            await serialProtocol.onConnected();
            console.log(SERIAL_PREFIX, 'Restarted into bootloader. Sending file.');

            let firmware = await fs.promises.readFile(firmwarePathArgv || '');
            let nak = 0;

            let xmodem = new Xmodem();
            xmodem.on('ready', count => {
                console.log(SERIAL_PREFIX, 'Sending', count, 'blocks');
                if (!debug) {
                    progressBar.start(count, 0);
                }
            });
            xmodem.on('stop', async (count) => {
                progressBar.stop();

                await serialProtocol.waitForBurnApplicationDone();

                console.log(SERIAL_PREFIX, 'Sent all blocks (NAK count: ' + nak + ')');

                if (skipReset) {
                    return process.exit(0);
                }

                console.log(SERIAL_PREFIX, 'Press **RESET** to start the application...');

                try {

                    if (await serialProtocol.isBootSuccessful()) {
                        console.log(SERIAL_PREFIX, 'Firmware update complete');
                        process.exit(0);
                    }
                    else {
                        console.log(SERIAL_PREFIX, 'Flashing failed, BOOT_FAIL detected');
                        console.log(SERIAL_PREFIX, 'Unplug your device, plug it back in, and reflash...');
                        process.exit(1);
                    }
                }
                catch (ex) {
                    console.log(SERIAL_PREFIX, 'Could not verify application', ex);
                    console.log(SERIAL_PREFIX, 'Did you press RESET on the board?');
                    process.exit(1);
                }
            });
            // xmodem.on('start', opcode => console.log(SERIAL_PREFIX, 'xmodem start', opcode));
            xmodem.on('status', ev => {
                if (ev.action === 'send') {
                    if (typeof ev.block === 'number') {
                        if (!debug) {
                            progressBar.update(ev.block);
                        }
                    }
                }
                else if (ev.action === 'recv') {
                    if (ev.signal === 'NAK') {
                        nak++;
                    }

                    if (ev.signal !== 'ACK' && ev.signal !== 'NAK') {
                        console.log(SERIAL_PREFIX, 'Failed to send block', ev);
                        process.exit(1);
                    }
                }
            });

            xmodem.send(serial, firmware);
        }
        catch (ex) {
            console.error(SERIAL_PREFIX, 'Error during update', ex);
            process.exit(1);
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

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    serial_connect();
}
