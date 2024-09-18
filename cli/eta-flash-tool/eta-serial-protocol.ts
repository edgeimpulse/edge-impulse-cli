import { SerialConnector } from "../serial-connector";

const CON_PREFIX = '\x1b[34m[SER]\x1b[0m';

export default class EtaSerialProtocol {
    private _serial: SerialConnector;
    private _writePacing: boolean;
    private _debug: boolean;

    /**
     *
     * @param serial An instance of the serial connector
     * @param writePacing Whether to add pauses when writing, ST board does not like this
     *                    with the demo AT command firmware.
     *                    Hummingbird can have this disabled.
     */
    constructor(serial: SerialConnector, writePacing: boolean, debug: boolean) {
        this._serial = serial;
        this._writePacing = writePacing;
        this._debug = debug;
    }

    async onConnected() {
        this._serial.write(Buffer.from('b\r', 'ascii')).then(() => { /*noop*/ }).catch(() => { /*noop*/ });

        await this.waitForSerialSequence(Buffer.from([ 0x3e, 0x20 ]), 1000, false, false);
    }

    async setBaudRate(baudRate: number) {
        await this._serial.setBaudRate(baudRate);
        await this._serial.write(Buffer.from('\r', 'ascii'));
    }

    async waitForBootloader(timeout: number) {
        await this.waitForSerialSequence(Buffer.from('Eta Compute Bootloader', 'ascii'), timeout);
        await this.sleep(100);
        await this._serial.write(Buffer.from('\r', 'ascii'));
        await this.waitForSerialSequence(Buffer.from([ 0x3e, 0x20 ]), 1000, false, false);
    }

    async rebootIntoBootloader() {
        let d = await this.execCommand('AT+BOOTMODE', 3000, 'AT+ACK', true);
        if (d.indexOf('AT+ACK') === -1) {
            throw new Error('Failed to reboot into bootloader (' + d + ')');
        }
    }

    async rebootIntoApplication() {
        let d = await this.execCommand('AT+APPMODE', 3000, 'AT+ACK', true);
        if (d.indexOf('AT+ACK') === -1) {
            throw new Error('Failed to reboot into application (' + d + ')');
        }
    }

    async getVersion() {
        let data = await this.execCommand('AT+VER?', 1500, 'AT+VER=', true);
        let lines = data.split('\r').map(f => f.trim()).filter(f => !!f);
        let line = lines.find(f => f.indexOf('AT+VER=') > -1);

        if (!line) {
            throw new Error('Failed to get version information (' + data + ')');
        }

        line = line.split('AT+VER=')[1];

        let [ major, minor, rev ] = line.split('.');
        return {
            major: Number(major),
            minor: Number(minor),
            patch: Number(rev)
        };
    }

    async sendAppInfo(name: string, target: 'ECM3532 M3', hash: number, firmwareLength: number) {
        let d = await this.execCommand('AT+APPINFO=' + name + ',' + target + ',' + hash + ',' + firmwareLength,
            1500, 'AT+ACK', true);
        if (d.indexOf('AT+ACK') === -1) {
            throw new Error('Failed to retrieve app info (' + d + ')');
        }

        let blobSize = d.match(/AT\+BLOBSIZE=(\d+)/);
        if (!blobSize || !blobSize[1] || isNaN(Number(blobSize[1]))) {
            throw new Error('Failed to retrieve blob size from bootloader, expected AT+BLOBSIZE=xxx but got ' + d);
        }

        return Number(blobSize[1]);
    }

    async sendBlock(sequence: number, buffer: Buffer, hash: number) {
        let d = await this.execCommand('AT+BINBLOB=' + sequence + ',' + hash + ',' + buffer.toString('base64'),
            1500, 'AT+ACKBLOB=' + sequence, true);
        if (d.indexOf('AT+ACKBLOB=' + sequence) === -1) {
            throw new Error('Block ' + sequence + ' was not acknowledged (' + d + ')');
        }
    }

    async sendEou() {
        let d = await this.execCommand('AT+EOU', 3000, 'AT+ACK', true);
        if (d.indexOf('AT+ACK') === -1) {
            throw new Error('Failed to process end of update (' + d + ')');
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
