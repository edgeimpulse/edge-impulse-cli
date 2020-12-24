// tslint:disable: no-unsafe-any

// tslint:disable-next-line
const serialPort = require('serialport');
import { EventEmitter } from 'tsee';

// Don't open same port twice
let serialPorts: { [index: string]: { message: typeof serialPort } } = { };

interface SerialPortListItem {
    path: string;
    manufacturer: string;
    serialNumber: string;
    pnpId: any;
    locationId: string;
    vendorId: string;
    productId: string;
}

export class SerialConnector extends EventEmitter<{
    connected: () => void,
    data: (a: Buffer) => void,
    error: (e: any) => void,
    close: () => void
}> {
    static async list() {
        return (await serialPort.list()) as SerialPortListItem[];
    }

    private connected: boolean;
    private path: string;
    private baudrate: number;
    private serial: typeof serialPort;
    private dataHandler: (a: Buffer) => void;

    constructor(path: string, baudrate: number) {
        super();

        this.path = path;
        this.baudrate = baudrate;
        this.dataHandler = (d: Buffer) => {
            this.emit('data', d);
        };
        this.connected = false;
    }

    is_connected() {
        return this.connected;
    }

    async connect() {
        let alreadyConnected = false;

        if (serialPorts[this.path]) {
            alreadyConnected = true;
            this.serial = serialPorts[this.path];
        }
        else {
            this.serial = new serialPort(this.path, { baudRate: this.baudrate });
            serialPorts[this.path] = this.serial;

            this.serial.on('close', () => {
                this.serial = null;
                delete serialPorts[this.path];
                this.connected = false;
                this.emit('close');
            });
        }

        this.serial.on('data', this.dataHandler);

        if (alreadyConnected) {
            return;
        }

        // otherwise wait for either error or open event
        return new Promise<void>((resolve, reject) => {
            this.serial.once('error', (ex: any) => {
                this.serial = null;
                delete serialPorts[this.path];
                reject(ex);
            });
            this.serial.once('open', () => {
                this.connected = true;

                this.emit('connected');

                this.serial.on('error', (ex: any) => this.emit('error', ex));

                resolve();
            });
        });
    }

    async write(buffer: Buffer) {
        return new Promise<void>((res, rej) => {
            if (!this.serial) return rej('Serial is null');

            this.serial.write(buffer, (err: any) => {
                if (err) return rej(err);
                res();
            });
        });
    }

    async setBaudRate(baudRate: number) {
        await this.serial.update({
            baudRate: baudRate
        });
    }

    async disconnect() {
        this.serial.off('data', this.dataHandler);
        return true;
    }

    async getMACAddress() {
        let list = await SerialConnector.list();
        let l = list.find(j => j.path === this.path);
        return l ? l.serialNumber : null;
    }

    async hasSerial() {
        return !!this.serial;
    }
}
