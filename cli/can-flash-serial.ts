import { SerialConnector } from "./serial-connector";
// tslint:disable-next-line: no-var-requires
// const drivelist = require('drivelist');
import fs from 'fs';
import inquirer from 'inquirer';
import util from 'util';
import Path from 'path';

const SERIAL_PREFIX = '\x1b[33m[SER]\x1b[0m';

export async function canFlashSerial(deviceId: string) {
    let device = (await SerialConnector.list()).find(d => d.path === deviceId);
    if (!device) {
        console.error(SERIAL_PREFIX, 'Cannot find ' + deviceId + ' in list anymore');
        return false;
    }

    if (device.vendorId === '0483' && device.productId?.toUpperCase() === '374B') {
        // DISCO-L475VG
        console.log(SERIAL_PREFIX, 'Detected ST B-L475E-IOT01A board, but failed to read config.');
        console.log(SERIAL_PREFIX, 'This can be because the device is not running the right firmware ' +
            'or because the device is not responsive (f.e. still scanning for WiFi networks).');
        console.log(SERIAL_PREFIX);
        console.log(SERIAL_PREFIX, 'To flash the Edge Impulse firmware:');
        console.log(SERIAL_PREFIX, '1. Download the latest version of the firmware from ' +
            'https://cdn.edgeimpulse.com/firmware/DISCO-L475VG-IOT01A.bin');
        console.log(SERIAL_PREFIX, '2. Copy the "DISCO-L475VG-IOT01A.bin" file to the DIS_L4IOT drive ' +
            '(mounted as USB mass-storage device).');
        console.log(SERIAL_PREFIX, '3. Wait until the red/yellow LEDs stopped flashing.');
        console.log(SERIAL_PREFIX, '4. Restart this application.');
        console.log('');

        // tslint:disable-next-line: max-line-length
        // let drives: { description: string, mountpoints: { label: string, path: string }[] }[] = await drivelist.list();
        // let d = drives.find(l => l.mountpoints.some(m => m.label === 'DIS_L4IOT'));
        // if (!d) {
        //     d = drives.find(l => l.description === 'MBED microcontroller USB Device');
        // }
        // if (!d) {
        //     console.error(SERIAL_PREFIX, 'Detected ST B-L475E-IOT01A board but cannot find ' +
        //         'mount point');
        //     return false;
        // }

        // let flashRes = await inquirer.prompt([{
        //     type: 'confirm',
        //     name: 'flash',
        //     message: 'ST B-L475E-IOT01A board detected, but cannot read config. ' +
        //         'Do you want to flash the Edge Impulse firmware for this board?',
        //     pageSize: 20
        // }]);
        // if (!flashRes.flash) return false;

        // let source = Path.join(__dirname, '..', '..', 'firmware', 'DISCO-L475VG-IOT01A.bin');

        // console.log(SERIAL_PREFIX, 'Copying from', source, 'to', d.mountpoints[0].path);
        // await util.promisify(fs.copyFile)(
        //     source,
        //     Path.join(d.mountpoints[0].path, Path.basename(source)));
        // console.log(SERIAL_PREFIX, 'Copied from', source, 'to', d.mountpoints[0].path);

        return false;
    }
    else {
        return false;
    }
}
