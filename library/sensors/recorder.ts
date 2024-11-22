// based on https://github.com/leon3s/node-mic-record (MIT licensed)

import {
    spawn,
    ChildProcess,
    SpawnOptions
} from 'child_process';
import { EventEmitter } from 'tsee';
import { spawnHelper } from './spawn-helper';
import fs from 'fs';
import util from 'util';

const PREFIX = '\x1b[35m[AUD]\x1b[0m';

export interface AudioRecorderOptionsNullable {
    sampleRate? : number;
    channels? : number;
    compress? : boolean;
    threshold? : number;
    thresholdStart? : number;
    thresholdEnd? : number;
    silence? : number;
    verbose? : boolean;
    audioType? : string;
    asRaw? : boolean;
}

interface AudioRecorderOptions {
    sampleRate: number;
    channels: number;
    compress: boolean;
    threshold: number;
    thresholdStart: number | null;
    thresholdEnd: number | null;
    silence: number;
    verbose: boolean;
    audioType: string;
    asRaw: boolean;
}

export interface AudioInstance {
    ee: EventEmitter<{ data: (b: Buffer) => void }>;
    stop: () => Promise<void>;
}

export class AudioRecorder {
    private _cp ? : ChildProcess;
    private _options: AudioRecorderOptions;

    constructor(options: AudioRecorderOptionsNullable) {
        let defaults: AudioRecorderOptions = {
            sampleRate: 16000,
            channels: 1,
            compress: false,
            threshold: 0.5,
            thresholdStart: null,
            thresholdEnd: null,
            silence: 1.0,
            verbose: false,
            audioType: 'wav',
            asRaw: false,
        };

        this._options = Object.assign(defaults, options);
    }

    async start(device: string) {
        let cmd: string;
        let cmdArgs: string[];
        let cmdOptions: SpawnOptions;
        let audioType: string;

        cmd = "sox";
        audioType = "wav";
        if (this._options.audioType) audioType = this._options.audioType;
        if (this._options.asRaw) audioType = "raw";

        if (process.platform === 'linux') {
            cmdArgs = [ '-t', 'alsa', device ];
        }
        else if (process.platform === 'darwin') {
            cmdArgs = [ '-t', 'coreaudio', device ];
        }
        else {
            console.warn(PREFIX, 'WARN: Could not detect platform, using default audio device');
            cmdArgs = [ '-d' ];
        }

        cmdArgs = cmdArgs.concat([
            '-q', // show no progress
            '-r', this._options.sampleRate.toString(), // sample rate
            '-c', '1', // channels
            '-e', 'signed-integer', // sample encoding
            '-b', '16', // precision (bits)
            '-t', audioType, // audio type
            '-'
        ]);

        try {
            await spawnHelper('which', [ cmd ]);
        }
        catch (ex) {
            throw new Error(`Missing "${cmd}" in PATH.`);
        }

        cmdOptions = { };
        // This does not appear to work
        // if (this._options.device) {
        //     cmdOptions.env = Object.assign({ }, process.env, {
        //         AUDIODEV: this._options.device
        //     });
        // }

        // Spawn audio capture command
        this._cp = spawn(cmd, cmdArgs, cmdOptions);
        if (this._options.verbose) {
            console.log('Recording via: ', cmd, cmdArgs, cmdOptions);
        }
        let rec = this._cp.stdout;
        if (!rec) {
            throw new Error('stdout is null');
        }

        if (this._options.verbose) {
            console.log('Recording', this._options.channels, 'channels with sample rate',
                this._options.sampleRate + '...');
            console.time('End Recording');

            rec.on('data', (data: Buffer) => {
                console.log('Recording %d bytes', data.length, data);
            });

            rec.on('end', () => {
                console.timeEnd('End Recording');
            });
        }

        let ee = new EventEmitter<{
            data: (b: Buffer) => void,
        }>();

        rec.on('data', (data: Buffer) => ee.emit('data', data));

        return new Promise<AudioInstance>((resolve, reject) => {
            if (!this._cp || !rec || !this._cp.stderr) {
                return reject('cp is null');
            }

            let err = '';
            this._cp.stderr.on('data', (data: Buffer) => err += data.toString('utf-8'));

            this._cp.on('error', reject);
            this._cp.on('close', (code) => {
                return reject(cmd + ' exited with code ' + code + ': ' + err);
            });
            // first data segment will resolve
            rec.once('data', () => {
                resolve({
                    ee: ee,
                    stop: this.stop.bind(this)
                });
            });

            setTimeout(() => {
                reject('Timeout when waiting for audio recording to start');
            }, 10000);
        });
    }

    static async ListDevices(): Promise<{ name: string, id: string }[]> {
        if (await this.exists('/proc/asound/cards')) {
            let devices: { name: string, id: string }[] = [];

            let data = await fs.promises.readFile('/proc/asound/cards', 'utf-8');

            let audioDevices = data.split('\n').map(d => d.trim()).filter(d => d.match(/^(\d+) .*?\]\: (.+)$/));
            for (let d of audioDevices) {
                let m = d.match(/^(\d+) .*?\]\: (.+)$/);
                if (m && m.length >= 3) {
                    devices.push({
                        name: m[2],
                        id: 'hw:' + m[1] + ',0'
                    });
                }
            }

            return devices;
        }
        else if (process.platform === 'darwin') {
            try {
                await spawnHelper('which', [ 'sox' ]);
            }
            catch (ex) {
                throw new Error(`Missing "sox" in PATH.`);
            }

            let data = await spawnHelper('sox', [
                '-V6',
                '-n',
                '-t',
                'coreaudio',
                'testtesttest'
            ], { ignoreErrors: true });

            let devices = [ ...new Set(data.split('\n')
                .filter(d => d.startsWith('sox INFO coreaudio: Found Audio Device'))
                .map(d => d.split('Found Audio Device ')[1])
                .map(d => d.substr(1, d.length - 2)))
            ];

            return devices.map(d => {
                return {
                    name: d,
                    id: d
                };
            });
        }
        else {
            return [{
                name: 'Default audio device',
                id: ''
            }];
        }
    }

    private stop() {
        if (!this._cp) {
            return Promise.resolve();
        }

        return new Promise < void > ((resolve) => {
            if (this._cp) {
                this._cp.on('close', code => {
                    resolve();
                });
                this._cp.kill('SIGINT');
                setTimeout(() => {
                    if (this._cp) {
                        this._cp.kill('SIGHUP');
                    }
                }, 3000);
            }
            else {
                resolve();
            }
        });
    }

    private static async exists(path: string) {
        let exists = false;
        try {
            await util.promisify(fs.stat)(path);
            exists = true;
        }
        catch (ex) {
            /* noop */
        }
        return exists;
    }
}