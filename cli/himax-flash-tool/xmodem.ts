/**
 * Based on xmodem.js (https://github.com/exsilium/xmodem.js)
 *
 * BSD 2-Clause License
 *
 * Copyright (c) 2017, Sten Feldman
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

import {
    EventEmitter
} from 'tsee';
import crc from 'crc';
import {
    SerialConnector
} from '../serial-connector';

const SOH = 0x01;
const EOT = 0x04;
const ACK = 0x06;
const NAK = 0x15;
const CAN = 0x18; // not implemented
const FILLER = 0x1A;
const CRC_MODE = 0x43; // 'C'

const SERIAL_PREFIX = '\x1b[32m[XMD]\x1b[0m';

export class Xmodem extends EventEmitter < {
    ready: (count: number) => void,
    start: (opcode: string) => void,
    status: (ev: {
        action: 'send' | 'recv',
        signal: string,
        block ? : number
    }) => void,
    stop: (n: number) => void
} > {
    /**
     * how many timeouts in a row before the sender gives up?
     * @constant
     * @type {integer}
     * @default
     */
    private XMODEM_MAX_TIMEOUTS = 5;

    /**
     * how many errors on a single block before the receiver gives up?
     * @constant
     * @type {integer}
     * @default
     */
    private XMODEM_MAX_ERRORS = 10;

    /**
     * how many times should receiver attempt to use CRC?
     * @constant
     * @type {integer}
     * @default
     */
    private XMODEM_CRC_ATTEMPTS = 3;

    /**
     * Try to use XMODEM-CRC extension or not? Valid options: 'crc' or 'normal'
     * @constant
     * @type {string}
     * @default
     */
    private XMODEM_OP_MODE = 'crc';

    /**
     * First block number. Don't change this unless you have need for non-standard
     * implementation.
     * @constant
     * @type {integer}
     * @default
     */
    private XMODEM_START_BLOCK = 1;

    /**
     * default timeout period in seconds
     * @constant
     * @type {integer}
     * @default
     */
    private timeoutSeconds = 10;

    /**
     * how many bytes (excluding header & checksum) in each block? Don't change this
     * unless you have need for non-standard implementation.
     * @constant
     * @type {integer}
     * @default
     */
    private blockSize = 128;

    private debug: boolean;

    constructor(debug = false) {
        super();

        this.debug = debug;
    }

    send(socket: SerialConnector, dataBuffer: Buffer) {
        let blockNumber = this.XMODEM_START_BLOCK;
        let packagedBuffer: Buffer[] = [];
        let currentBlock = Buffer.alloc(this.blockSize);
        let sentEof = false;
        let _self = this;

        if (this.debug) {
            console.log(SERIAL_PREFIX, 'Sending', dataBuffer.length);
        }

        // FILLER
        for (let i = 0; i < this.XMODEM_START_BLOCK; i++) {
            packagedBuffer.push(Buffer.from(''));
        }

        while (dataBuffer.length > 0) {
            for (let i = 0; i < this.blockSize; i++) {
                currentBlock[i] = dataBuffer[i] === undefined ? FILLER : dataBuffer[i];
            }
            dataBuffer = dataBuffer.slice(this.blockSize);
            packagedBuffer.push(currentBlock);
            currentBlock = Buffer.alloc(this.blockSize);
        }

        /**
         * Ready to send event, buffer has been broken into individual blocks to be sent.
         * @event Xmodem#ready
         * @property {integer} - Indicates how many blocks are ready for transmission
         */
        _self.emit('ready', packagedBuffer.length - 1); // We don't count the filler

        const sendData = async (data: Buffer) => {
            /*
             * Here we handle the beginning of the transmission
             * The receiver initiates the transfer by either calling
             * checksum mode or CRC mode.
             */
            if (data[0] === CRC_MODE && blockNumber === _self.XMODEM_START_BLOCK) {
                if (this.debug) {
                    console.log(SERIAL_PREFIX, "[SEND] - received C byte for CRC transfer!");
                }

                _self.XMODEM_OP_MODE = 'crc';
                if (packagedBuffer.length > blockNumber) {
                    /**
                     * Transmission Start event. A successful start of transmission.
                     * @event Xmodem#start
                     * @property {string} - Indicates transmission mode 'crc' or 'normal'
                     */
                    _self.emit('start', _self.XMODEM_OP_MODE);
                    await this.sendBlock(socket, blockNumber, packagedBuffer[blockNumber], _self.XMODEM_OP_MODE);
                    _self.emit('status', {
                        action: 'send',
                        signal: 'SOH',
                        block: blockNumber
                    });
                    blockNumber++;
                }
            }
            else if (data[0] === NAK && blockNumber === _self.XMODEM_START_BLOCK) {
                if (this.debug) {
                    console.log(SERIAL_PREFIX, "[SEND] - received NAK byte for standard checksum transfer!");
                }
                _self.XMODEM_OP_MODE = 'normal';
                if (packagedBuffer.length > blockNumber) {
                    _self.emit('start', _self.XMODEM_OP_MODE);
                    await this.sendBlock(socket, blockNumber, packagedBuffer[blockNumber], _self.XMODEM_OP_MODE);
                    _self.emit('status', {
                        action: 'send',
                        signal: 'SOH',
                        block: blockNumber
                    });
                    blockNumber++;
                }
            }
            /*
             * Here we handle the actual transmission of data and
             * retransmission in case the block was not accepted.
             */
            else if (data[0] === ACK && blockNumber > _self.XMODEM_START_BLOCK) {
                // Woohooo we are ready to send the next block! :)
                if (this.debug) {
                    console.log(SERIAL_PREFIX, 'ACK RECEIVED');
                }
                _self.emit('status', {
                    action: 'recv',
                    signal: 'ACK'
                });
                if (packagedBuffer.length > blockNumber) {
                    await this.sendBlock(socket, blockNumber, packagedBuffer[blockNumber], _self.XMODEM_OP_MODE);
                    _self.emit('status', {
                        action: 'send',
                        signal: 'SOH',
                        block: blockNumber
                    });
                    blockNumber++;
                }
                else if (packagedBuffer.length === blockNumber) {
                    // We are EOT
                    if (sentEof === false) {
                        sentEof = true;
                        if (this.debug) {
                            console.log(SERIAL_PREFIX, "WE HAVE RUN OUT OF STUFF TO SEND, EOT EOT!");
                        }
                        _self.emit('status', {
                            action: 'send',
                            signal: 'EOT'
                        });
                        await socket.write(Buffer.from([EOT]));
                    }
                    else {
                        // We are finished!
                        if (this.debug) {
                            console.log(SERIAL_PREFIX, '[SEND] - Finished!');
                        }
                        _self.emit('stop', 0);
                        socket.removeListener('data', sendData);
                    }
                }
            }
            else if (data[0] === NAK && blockNumber > _self.XMODEM_START_BLOCK) {
                if (blockNumber === packagedBuffer.length && sentEof) {
                    if (this.debug) {
                        console.log(SERIAL_PREFIX, '[SEND] - Resending EOT, because receiver responded with NAK.');
                    }
                    _self.emit('status', {
                        action: 'send',
                        signal: 'EOT'
                    });
                    await socket.write(Buffer.from([EOT]));
                }
                else {
                    if (this.debug) {
                        console.log(SERIAL_PREFIX, '[SEND] - Packet corruption detected, resending previous block.');
                    }
                    _self.emit('status', {
                        action: 'recv',
                        signal: 'NAK'
                    });
                    blockNumber--;
                    if (packagedBuffer.length > blockNumber) {
                        await this.sendBlock(socket, blockNumber, packagedBuffer[blockNumber], _self.XMODEM_OP_MODE);
                        _self.emit('status', {
                            action: 'send',
                            signal: 'SOH',
                            block: blockNumber
                        });
                        blockNumber++;
                    }
                }
            }
            else {
                if (this.debug) {
                    console.log(SERIAL_PREFIX, "GOT SOME UNEXPECTED DATA which was not handled properly!");
                    console.log(SERIAL_PREFIX, "===>");
                    console.log(SERIAL_PREFIX, data);
                    console.log(SERIAL_PREFIX, "<===");
                    console.log(SERIAL_PREFIX, "blockNumber: " + blockNumber);
                }
            }
        };

        socket.on('data', sendData);
    }

    private async sendBlock(socket: SerialConnector, blockNr: number, blockData: Buffer, mode: string) {
        let crcCalc = 0;
        let sendBuffer = Buffer.concat([Buffer.from([SOH]),
            Buffer.from([blockNr]),
            Buffer.from([(0xFF - blockNr)]),
            blockData
        ]);
        if (this.debug) {
            console.log(SERIAL_PREFIX, 'SENDBLOCK! Data length: ' + blockData.length);
            console.log(SERIAL_PREFIX, sendBuffer);
        }
        if (mode === 'crc') {
            let crcString = crc.crc16xmodem(blockData).toString(16);
            // Need to avoid odd string for Buffer creation
            if (crcString.length % 2 === 1) {
                crcString = '0'.concat(crcString);
            }
            // CRC must be 2 bytes of length
            if (crcString.length === 2) {
                crcString = '00'.concat(crcString);
            }
            sendBuffer = Buffer.concat([sendBuffer, Buffer.from(crcString, "hex")]);
        }
        else {
            // Count only the blockData into the checksum
            for (let i = 3; i < sendBuffer.length; i++) {
                crcCalc = crcCalc + sendBuffer.readUInt8(i);
            }
            crcCalc = crcCalc % 256;
            let crcStr = crcCalc.toString(16);
            if ((crcStr.length % 2) !== 0) {
                // Add padding for the string to be even
                crcStr = "0" + crcStr;
            }
            sendBuffer = Buffer.concat([sendBuffer, Buffer.from(crcStr, "hex")]);
        }
        if (this.debug) {
            console.log(SERIAL_PREFIX, 'Sending buffer with total length: ' + sendBuffer.length);
        }
        await socket.write(sendBuffer);
    }
}
