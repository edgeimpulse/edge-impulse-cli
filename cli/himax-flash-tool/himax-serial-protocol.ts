import e from "express";
import { SerialConnector } from "../serial-connector";

const CON_PREFIX = '\x1b[34m[SER]\x1b[0m';

export enum HimaxDeviceTypes {
    WEIPlus = 'WE-I-Plus',
    WiseEye2 = 'WiseEye2'
}

export class HimaxSerialProtocol {
    private _serial: SerialConnector;
    private _writePacing: boolean;
    private _debug: boolean;
    private _deviceType: HimaxDeviceTypes;

    /**
     *
     * @param serial An instance of the serial connector
     * @param writePacing Whether to add pauses when writing, ST board does not like this
     *                    with the demo AT command firmware.
     *                    Hummingbird can have this disabled.
     */
    constructor(serial: SerialConnector, writePacing: boolean, deviceType: HimaxDeviceTypes, debug: boolean) {
        this._serial = serial;
        this._writePacing = writePacing;
        this._deviceType = deviceType;
        this._debug = debug;
    }

    async setBaudRate(baudRate: number) {
        await this._serial.setBaudRate(baudRate);
        await this._serial.write(Buffer.from('\r', 'ascii'));
    }

    async onConnected() {
        if (this._deviceType === HimaxDeviceTypes.WEIPlus) {
            await this.waitForSerialSequence(Buffer.from('wake up evt:4', 'ascii'), 60000, true, false);
        }
        else if (this._deviceType === HimaxDeviceTypes.WiseEye2) {
            await this.waitForSerialSequence(Buffer.from(
                'Please input any key to enter X-Modem mode in 100 ms', 'ascii'), 60000, true, false);
        }
        else {
            throw new Error('Unknown device type');
        }
        await this.execCommand('1', 1000, 'Xmodem download and burn', true);
        await this.execCommand('1', 1000, 'Send data using the xmodem protocol from your terminal', true);
    }

    async isBootSuccessful() {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            (async () => {
                try {
                    if (this._deviceType === HimaxDeviceTypes.WEIPlus) {
                        await this.waitForSerialSequence(Buffer.from('1st APPLICATION', 'ascii'), 10000);
                    }
                    else if (this._deviceType === HimaxDeviceTypes.WiseEye2) {
                        await this.waitForSerialSequence(Buffer.from('Compiler Version', 'ascii'), 10000);
                    }
                    else {
                        throw new Error('Unknown device type');
                    }
                    resolve(true);
                }
                catch (ex) {
                    reject(ex);
                }
            })();

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            (async () => {
                try {
                    await this.waitForSerialSequence(Buffer.from('BOOT_FAIL', 'ascii'), 60000);
                    resolve(false);
                }
                catch (ex) {
                    reject(ex);
                }
            })();
        });
    }

    async waitForBurnApplicationDone() {
        if (this._deviceType === HimaxDeviceTypes.WEIPlus) {
            await this.waitForSerialSequence(Buffer.from('burn application done', 'ascii'), 10000);
        }
        else if (this._deviceType === HimaxDeviceTypes.WiseEye2) {
            await this.execCommand('y', 1000, 'Do you want to end file transmission and reboot system? (y)', true);
        }
        else {
            throw new Error('Unknown device type');
        }
    }

    private sleep(ms: number) {
        return new Promise((res) => setTimeout(res, ms));
    }

    /**
     * Execute an AT command
     * @param command The command (including AT+, but without \r or \n)
     * @param timeout Maximum time the device can take to execute the command
     * @param successSequence Which sequence of bytes is required for success (e.g. AT+ACK)
     * @param logProgress Whether to log progress to stdout
     * @param logResponse Whether to log the response to stdout
     */
    private async execCommand(command: string, timeout: number = 1000,
                              successSequence: string,
                              logProgress: boolean = false) {

        let retriesLeft = 3;

        while (--retriesLeft >= 0) {
            command = command + '\r';

            if (this._writePacing) {
                // split it up a bit for pacing
                for (let ix = 0; ix < command.length; ix += 5) {
                    // console.log(CON_PREFIX, 'writing', command.substr(ix, 5));
                    if (ix !== 0) {
                        await this.sleep(5);
                    }

                    await this._serial.write(Buffer.from(command.substr(ix, 5), 'ascii'));
                }
            }
            else {
                await this._serial.write(Buffer.from(command, 'ascii'));
            }

            try {
                let data = await this.waitForSerialSequence(
                    Buffer.from(successSequence, 'ascii'), timeout, logProgress);
                data = this.parseSerialResponse(data);

                if (data.toString('ascii').trim().indexOf('AT+NACK') > -1) {
                    if (retriesLeft === 0) {
                        throw new Error('Error when communicating with device: ' + data.toString('ascii').trim());
                    }
                    else {
                        if (this._debug) {
                            console.log(CON_PREFIX, 'Command failed (' + data.toString('ascii').trim() + '), retrying in 0.5 seconds');
                        }
                        await this.sleep(500);
                        continue;
                    }
                }

                if (this._debug) {
                    console.log(CON_PREFIX, 'response from device', data.length, data.toString('hex'));
                }

                return data.toString('ascii').trim();
            }
            catch (ex2) {
                let ex = <Error>ex2;
                let msg = ex.message || ex.toString();
                if (retriesLeft === 0) {
                    throw ex;
                }
                if (msg.indexOf('Timeout') > -1) {
                    if (this._debug) {
                        console.log(CON_PREFIX, 'Command failed (' + msg + '), retrying in 0.5 seconds');
                    }
                    await this.sleep(500);
                    continue;
                }
                else {
                    throw ex;
                }
            }
        }

        throw new Error('Command failed (no more retries left)');
    }

    /**
     * Wait until a certain sequence is seen on the serial port
     * @param seq Buffer with the exact sequence
     * @param timeout Timeout in milliseconds
     */
    private waitForSerialSequence(seq: Buffer, timeout: number, logProgress: boolean = false,
                                  waitForNextNewline: boolean = true): Promise<Buffer> {
        let total = 0;
        let nextReport = 10000;
        let foundSeq = false;

        return new Promise((res, rej) => {
            let buffer = Buffer.from([]);

            let to = setTimeout(() => {
                this._serial.off('data', fn);
                rej('Failed to get a valid response (looking for "' + seq.toString('ascii') + '") from device. ' +
                    'Response was: "' + buffer.toString('ascii') + '"');
            }, timeout);

            if (timeout < 0) {
                rej('Timeout');
            }

            let fn = (data: Buffer) => {
                if (this._debug) {
                    console.log(CON_PREFIX, 'serial.ondata rx', data.toString('hex'));
                }
                if (logProgress) {
                    total += data.length;
                    if (total > nextReport) {
                        console.log(CON_PREFIX, 'Received', total, 'bytes');
                        nextReport += 10000;
                    }
                }
                buffer = Buffer.concat([ buffer, data ]);
                if (buffer.indexOf(seq) !== -1) {
                    if (foundSeq || buffer.slice(buffer.indexOf(seq)).indexOf('\r') > -1 || !waitForNextNewline) {
                        clearTimeout(to);
                        this._serial.off('data', fn);

                        if (buffer.slice(buffer.indexOf(seq)).indexOf('\r') > -1) {
                            let end = buffer.indexOf(seq) + buffer.slice(buffer.indexOf(seq)).indexOf('\r');
                            res(buffer.slice(0, end));
                        }
                        else {
                            res(buffer);
                        }
                    }
                    else {
                        foundSeq = true;
                    }
                }
                else if (foundSeq && data.indexOf('\r') > -1) {
                    clearTimeout(to);
                    this._serial.off('data', fn);
                    res(buffer.slice(0, buffer.length - data.length + data.indexOf('\r')));
                }
            };
            this._serial.on('data', fn);
        });
    }

    /**
     * Wait until a certain sequence is seen on the serial port
     * @param seq Buffer with the exact sequence
     * @param timeout Timeout in milliseconds
     */
    private getSerialSequenceCallback(seqStr: string, timeout: number, callback: (buffer: Buffer) => void) {
        let seq = Buffer.from(seqStr, 'ascii');
        let buffer = Buffer.from([]);

        let to = setTimeout(() => {
            this._serial.off('data', fn);
        }, timeout);

        let fn = (data: Buffer) => {
            buffer = Buffer.concat([ buffer, data ]);
            if (buffer.indexOf(seq) !== -1) {
                clearTimeout(to);
                this._serial.off('data', fn);
                callback(buffer);
            }
        };
        this._serial.on('data', fn);

        return {
            cancelListener: () => this._serial.off('data', fn)
        };
    }

    /**
     * Take the serial response and grab the actual response from the device
     * @param data
     */
    private parseSerialResponse(data: Buffer) {
        // some devices only print \n, not \r\n
        let b = [];
        if (data[0] === 0xa) {
            b.push(0xd);
            b.push(0xa);
        }
        else {
            b.push(data[0]);
        }

        for (let ix = 1; ix < data.length; ix++) {
            if (data[ix] === 0xa && data[ix - 1] !== 0xd) {
                b.push(0xd);
                b.push(0xa);
            }
            else {
                b.push(data[ix]);
            }
        }

        let bdata = Buffer.from(b);

        // skip first and last line
        // let first = bdata.indexOf(Buffer.from([ 0x0d, 0x0a ]));
        // let last = bdata.lastIndexOf(Buffer.from([ 0x0d, 0x0a ]));

        return bdata;
    }
}
