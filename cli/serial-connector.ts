/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const serialPort = require('serialport');
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import { ISerialConnector } from '../shared/daemon/iserialconnector';

// Don't open same port twice
let serialPorts: { [index: string]: { message: typeof serialPort } } = { };

interface SerialPortListItem {
    path: string;
    manufacturer: string;
    serialNumber: string;
    pnpId: string;
    locationId: string;
    vendorId: string;
    productId: string;
}

export class SerialConnector extends (EventEmitter as new () => TypedEmitter<{
    connected: () => void;
    data: (buffer: Buffer) => void;
    error: (err: any) => void;
    close: () => void;
}>) implements ISerialConnector {
    static async list() {
        return (await serialPort.list()) as SerialPortListItem[];
    }

    private _connected: boolean;
    private _echoSerial: boolean;
    private _path: string;
    private _baudrate: number;
    private _serial: typeof serialPort;
    private _dataHandler: (a: Buffer) => void;

    constructor(path: string, baudrate: number, echoSerial: boolean = false) {
        // eslint-disable-next-line constructor-super
        super();

        this._echoSerial = echoSerial;
        this._path = path;
        this._baudrate = baudrate;
        this._dataHandler = (d: Buffer) => {
            if (this._echoSerial) {
                const CON_PREFIX = '\x1b[36m[Rx ]\x1b[0m';
                console.log(CON_PREFIX, d.toString('ascii'));
            }
            this.emit('data', d);
        };
        this._connected = false;
    }

    getPath() {
        return this._path;
    }

    isConnected() {
        return this._connected;
    }

    async connect() {
        let alreadyConnected = false;

        if (serialPorts[this._path]) {
            alreadyConnected = true;
            this._serial = serialPorts[this._path];
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            this._serial = new serialPort(this._path, { baudRate: this._baudrate });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            serialPorts[this._path] = this._serial;

            this._serial.on('close', () => {
                this._serial = null;
                delete serialPorts[this._path];
                this._connected = false;
                this.emit('close');
            });
        }

        this._serial.on('data', this._dataHandler);

        if (alreadyConnected) {
            return;
        }

        // otherwise wait for either error or open event
        return new Promise<void>((resolve, reject) => {
            this._serial.once('error', (ex: any) => {
                this._serial = null;
                delete serialPorts[this._path];
                reject(ex);
            });
            this._serial.once('open', () => {
                this._connected = true;

                this.emit('connected');

                this._serial.on('error', (ex: any) => this.emit('error', ex));

                resolve();
            });
        });
    }

    async write(buffer: Buffer) {
        return new Promise<void>((res, rej) => {
            if (!this._serial) return rej('Serial is null');
            if (this._echoSerial) {
                const CON_PREFIX = '\x1b[35m[Tx ]\x1b[0m';
                console.log(CON_PREFIX, buffer.toString('ascii'));
            }
            this._serial.write(buffer, (err: any) => {
                if (err) return rej(err);
                res();
            });
        });
    }

    async setBaudRate(baudRate: number) {
        await this._serial.update({
            baudRate: baudRate
        });
        this._baudrate = baudRate;
    }

    getBaudRate() {
        return this._baudrate;
    }

    async disconnect() {
        this._serial.off('data', this._dataHandler);
        return true;
    }

    async getMACAddress() {
        let list = await SerialConnector.list();
        let l = list.find(j => j.path === this._path);
        return l ? l.serialNumber : null;
    }

    async hasSerial() {
        return !!this._serial;
    }

    canSwitchBaudRate() {
        return true;
    }
}
