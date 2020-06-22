import { SerialConnector } from "./serial-connector";
import inquirer from 'inquirer';

const SERIAL_PREFIX = '\x1b[33m[SER]\x1b[0m';

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

export async function findSerial() {
    let filteredDevices;
    while (1) {
        let allDevices = await SerialConnector.list();
        filteredDevices = allDevices;

        if (process.platform === 'darwin') {
            filteredDevices = allDevices.filter(d => d.path.indexOf('tty.usb') > -1);
        }
        else if (process.platform === 'linux') {
            filteredDevices = allDevices.filter(d => d.path.indexOf('ttyACM') > -1 || d.path.indexOf('ttyUSB') > -1);
        }
        else {
            filteredDevices = allDevices.filter(d => d.manufacturer.indexOf('Standard port types') === -1);
        }

        if (filteredDevices.length === 0) {
            console.error(SERIAL_PREFIX,
                'Could not find any devices connected over serial port');
            console.error(SERIAL_PREFIX, 'Retrying in 5 seconds');
            await sleep(5000);
        }
        else {
            break;
        }
    }

    filteredDevices = filteredDevices || [];

    let deviceId = filteredDevices[0].path;

    if (filteredDevices.length > 1) {
        let deviceRes = await inquirer.prompt([{
            type: 'list',
            choices: filteredDevices.map(d => ({
                value: d.path,
                name: d.path + (d.manufacturer ? ' (' + d.manufacturer + ')' : '')
            })),
            name: 'device',
            message: 'Which device do you want to connect to?',
            pageSize: 20
        }]);
        deviceId = deviceRes.device;
    }

    return deviceId;
}
