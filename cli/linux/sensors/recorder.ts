// based on https://github.com/leon3s/node-mic-record (MIT licensed)

import {
    spawn,
    ChildProcess,
    SpawnOptions
} from 'child_process';
import { EventEmitter } from 'tsee';
import { spawnHelper } from './spawn-helper';

export interface AudioRecorderOptionsNullable {
    sampleRate ? : number;
    channels ? : number;
    compress ? : boolean;
    threshold ? : number;
    thresholdStart ? : number;
    thresholdEnd ? : number;
    silence ? : number;
    verbose ? : boolean;
    recordProgram ? : 'sox' | 'rec' | 'arecord';
    audioType ? : string;
    asRaw ? : boolean;
    device ? : string;
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
    recordProgram: 'sox' | 'rec' | 'arecord';
    audioType: string;
    asRaw: boolean;
    device: string | null;
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
            recordProgram: 'sox',
            audioType: 'wav',
            asRaw: false,
            device: null
        };

        this._options = Object.assign(defaults, options);
    }

    async start() {
        let cmd: string;
        let cmdArgs: string[];
        let cmdOptions: SpawnOptions;
        let audioType: string;

        switch (this._options.recordProgram) {
            // On some Windows machines, sox is installed using the "sox" binary
            // instead of "rec"
            case 'sox': {
                cmd = "sox";
                audioType = "wav";
                if (this._options.audioType) audioType = this._options.audioType;
                if (this._options.asRaw) audioType = "raw";
                cmdArgs = [
                    '-q', // show no progress
                    '-d',
                    '-r', this._options.sampleRate.toString(), // sample rate
                    '-c', '1', // channels
                    '-e', 'signed-integer', // sample encoding
                    '-b', '16', // precision (bits)
                    '-t', audioType, // audio type
                    '-'
                ];
                break;
            }
            case 'rec':
            default: {
                cmd = "rec";
                audioType = "wav";
                if (this._options.audioType) audioType = this._options.audioType;
                cmdArgs = [
                    '-q', // show no progress
                    '-r', this._options.sampleRate + '', // sample rate
                    '-c', this._options.channels + '', // channels
                    '-e', 'signed-integer', // sample encoding
                    '-b', '16', // precision (bits)
                    '-t', audioType, // audio type
                    '-', // pipe
                    // end on silence
                    'silence', '1', '0.1', (this._options.thresholdStart || (this._options.threshold + '%')).toString(),
                    '1', this._options.silence.toString(),
                    (this._options.thresholdEnd || this._options.threshold + '%').toString()
                ];
                break;
            }
            // On some systems (RasPi), arecord is the prefered recording binary
            case 'arecord': {
                cmd = 'arecord';
                audioType = "wav";
                if (this._options.audioType) audioType = this._options.audioType;
                cmdArgs = [
                    '-q', // show no progress
                    '-r', this._options.sampleRate + '', // sample rate
                    '-c', this._options.channels + '', // channels
                    '-t', audioType, // audio type
                    '-f', 'S16_LE', // Sample format
                    '-' // pipe
                ];
                if (this._options.device) {
                    cmdArgs.unshift('-D', this._options.device);
                }
                break;
            }
        }

        try {
            await spawnHelper('which', [ cmd ]);
        }
        catch (ex) {
            throw new Error(`Missing "${cmd}" in PATH.`);
        }

        // Spawn audio capture command
        cmdOptions = { };
        if (this._options.device) {
            cmdOptions.env = Object.assign({ }, process.env, {
                AUDIODEV: this._options.device
            });
        }

        this._cp = spawn(cmd, cmdArgs, cmdOptions);
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
            } else {
                resolve();
            }
        });
    }
}