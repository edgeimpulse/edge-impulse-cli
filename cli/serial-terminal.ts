#!/usr/bin/env node

import fs from 'fs';
import Path from 'node:path';
import { Config } from '../cli-common/config';
import { findSerial } from './find-serial';
import checkNewVersions from '../cli-common/check-new-version';
import program from 'commander';
import SerialPort = require('serialport');
import inquirer from 'inquirer';
import searchList from 'inquirer-search-list';

inquirer.registerPrompt('search-list', searchList);

const packageVersion = (<{ version: string }>JSON.parse(fs.readFileSync(
    Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;

program
    .description('Serial terminal')
    .version(packageVersion)
    .option('--baud-rate <n>', 'Baud rate (default: 115200)')
    .option('--device <device>', 'Specify device (if not specified, will prompt when multiple devices found)')
    .allowUnknownOption(true)
    .parse(process.argv);

if (typeof program.baudRate === 'string' && isNaN(Number(program.baudRate))) {
    console.log('Baud rate should be numeric');
    process.exit(1);
}
const baudrateArgv = typeof program.baudRate === 'string' ? Number(program.baudRate) : 115200;
const deviceArgv = <string | undefined>program.device;

const SERIAL_PREFIX = '\x1b[33m[SER]\x1b[0m';

const configFactory = new Config();
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    try {
        try {
            await checkNewVersions(configFactory);
        }
        catch (ex) {
            /* noop */
        }

        if (deviceArgv) {
            console.log(SERIAL_PREFIX, `Connecting to ${deviceArgv} (via --device) (baud rate ${baudrateArgv})`);
            await connectToSerial(deviceArgv);
        }
        else {
            let deviceId = await findSerial(undefined);
            console.log(SERIAL_PREFIX, `Connecting to ${deviceId} (baud rate ${baudrateArgv})`);
            await connectToSerial(deviceId);
        }
    }
    catch (ex) {
        console.error('Failed to set up serial daemon', ex);
    }
})();

async function connectToSerial(deviceId: string) {
    const port = new SerialPort(deviceId, {
        baudRate: baudrateArgv,
    });
    port.pipe(process.stdout);

    port.on('error', err => {
        console.error(SERIAL_PREFIX, 'Error:', err);
        process.exit(1);
    });

    port.on('open', () => {
        console.log(SERIAL_PREFIX, `Connected to ${deviceId}. Press CTRL+D to quit.`);
    });

    port.on('close', err => {
        if (err) {
            console.log(SERIAL_PREFIX, 'Serial port was closed with error:', err);
        }
        else {
            console.log(SERIAL_PREFIX, 'Serial port was closed');
        }
        process.exit(err ? 1 : 0);
    });
    process.stdin.setRawMode(true);
    process.stdin.on('data', input => {
        for (const byte of input) {
            // ctrl+d
            if (byte === 0x04) {
                console.log('');
                console.log(SERIAL_PREFIX, 'Received CTRL+D, disconnecting...');
                port.close();
                process.exit(0);
            }
        }
        port.write(input);
        // output.write(input)
    });
    process.stdin.resume();

    process.stdin.on('end', () => {
        port.close();
        process.exit(0);
    });
}
