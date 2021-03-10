import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'tsee';
import fs from 'fs';
import Path from 'path';
import os from 'os';
import { spawnHelper } from './spawn-helper';
import { ICamera } from './icamera';
import util from 'util';
import crypto from 'crypto';
import sharp from 'sharp';

const PREFIX = '\x1b[34m[STR]\x1b[0m';

export class Ffmpeg extends EventEmitter<{
    snapshot: (buffer: Buffer) => void,
    error: (message: string) => void
}> implements ICamera {
    private _captureProcess?: ChildProcess;
    private _tempDir?: string;
    private _watcher?: fs.FSWatcher;
    private _handledFiles: { [k: string]: true } = { };
    private _verbose: boolean;
    private _lastHash = '';
    private _processing = false;

    constructor(verbose: boolean) {
        super();

        this._verbose = verbose;
    }

    async init() {
        try {
            await spawnHelper('which', [ 'ffmpeg' ]);
        }
        catch (ex) {
            throw new Error('Missing "ffmpeg" in PATH. Install via `sudo apt install -y ffmpeg`');
        }
        try {
            await spawnHelper('which', [ 'v4l2-ctl' ]);
        }
        catch (ex) {
            throw new Error('Missing "v4l2-ctl" in PATH. Install via `sudo apt install -y v4l-utils`');
        }
    }

    async listDevices() {
        let lines = (await spawnHelper('v4l2-ctl', [ '--list-devices' ]))
            .split('\n').filter(x => !!x);

        let devices: { name: string, id: string }[] = [];
        let currDevice: string | undefined;
        for (let l of lines) {
            if (!l.startsWith('\t')) {
                currDevice = l;
                continue;
            }
            if (currDevice && !currDevice.startsWith('bcm2835-')) {
                devices.push({
                    name: currDevice + ' (' + l.trim() + ')',
                    id: l.trim()
                });
                continue;
            }
        }

        return devices;
    }

    async start(options: {
        deviceId: string,
        intervalMs: number
    }) {
        if (this._captureProcess) {
            throw new Error('Capture was already started');
        }

        this._handledFiles = { };

        // if we have /dev/shm, use that (RAM backed, instead of SD card backed, better for wear)
        let osTmpDir = os.tmpdir();
        if (await this.exists('/dev/shm')) {
            osTmpDir = '/dev/shm';
        }

        this._tempDir = await fs.promises.mkdtemp(Path.join(osTmpDir, 'edge-impulse-cli'));
        const devices = await this.listDevices();
        if (!devices.find(d => d. id === options.deviceId)) {
            throw new Error('Invalid device ' + options.deviceId);
        }

        // -t 9999 -c /dev/video0 -r 5 -o hello00001.jpeg
        const rate = (1000 / options.intervalMs).toString();

        const args = [
            `-framerate`, rate,
            `-video_size`, `640x480`,
            `-c:v`, `mjpeg`,
            `-i`, options.deviceId,
            `-f`, `image2`,
            `-c:v`, `copy`,
            `-bsf:v`, `mjpeg2jpeg`,
            `-qscale:v`, `2`,
            `test%d.jpg`
        ];

        if (this._verbose) {
            console.log(PREFIX, 'Starting ffmpeg with', args);
        }

        this._captureProcess = spawn('ffmpeg', args, { env: process.env, cwd: this._tempDir });

        if (this._captureProcess && this._captureProcess.stdout && this._captureProcess.stderr &&
            this._verbose) {
            this._captureProcess.stdout.on('data', (d: Buffer) => {
                console.log(PREFIX, d.toString('utf-8'));
            });
            this._captureProcess.stderr.on('data', (d: Buffer) => {
                console.log(PREFIX, d.toString('utf-8'));
            });
        }

        let lastPhoto = 0;

        this._watcher = fs.watch(this._tempDir, async (eventType, fileName) => {
            if (eventType !== 'rename') return;
            if (!(fileName.endsWith('.jpeg') || fileName.endsWith('.jpg'))) return;
            if (!this._tempDir) return;
            if (this._handledFiles[fileName]) return;
            if (this._processing) return;

            try {
                this._processing = true;
                this._handledFiles[fileName] = true;

                if (lastPhoto !== 0 && this._verbose) {
                    console.log(PREFIX, 'Got snapshot', fileName, 'time since last:',
                        (Date.now() - lastPhoto) + 'ms.');
                }

                try {
                    let data = await fs.promises.readFile(Path.join(this._tempDir, fileName));

                    // hash not changed? don't emit another event (streamer does this on Rpi)
                    let hash = crypto.createHash('sha256').update(data).digest('hex');
                    if (hash !== this._lastHash) {
                        this.emit('snapshot', data);
                        lastPhoto = Date.now();
                    }
                    else if (this._verbose) {
                        console.log(PREFIX, 'Discarding', fileName, 'hash does not differ');
                    }
                    this._lastHash = hash;
                }
                catch (ex) {
                    console.error('Failed to load file', Path.join(this._tempDir, fileName), ex);
                }

                if (await this.exists(Path.join(this._tempDir, fileName))) {
                    await fs.promises.unlink(Path.join(this._tempDir, fileName));
                }
            }
            finally {
                this._processing = false;
            }
        });

        return new Promise<void>((resolve, reject) => {
            if (this._captureProcess) {
                this._captureProcess.on('close', code => {
                    if (typeof code === 'number') {
                        reject('Capture process failed with code ' + code);
                    }
                    else {
                        reject('Failed to start capture process, but no exit code. ' +
                            'This might be a permissions issue. ' +
                            'Are you running this command from a simulated shell (like in Visual Studio Code)?');
                    }
                    this._captureProcess = undefined;
                });
            }

            // tslint:disable-next-line: no-floating-promises
            (async () => {
                if (!this._tempDir) {
                    throw new Error('tempDir is undefined');
                }

                const watcher = fs.watch(this._tempDir, () => {
                    resolve();
                    watcher.close();
                });

                setTimeout(() => {
                    return reject('First photo was not created within 20 seconds');
                }, 20000);
            })();
        });
    }

    async stop() {
        return new Promise<void>((resolve) => {
            if (this._captureProcess) {
                this._captureProcess.on('close', code => {
                    if (this._watcher) {
                        this._watcher.close();
                    }
                    resolve();
                });
                this._captureProcess.kill('SIGINT');
                setTimeout(() => {
                    if (this._captureProcess) {
                        this._captureProcess.kill('SIGHUP');
                    }
                }, 3000);
            }
            else {
                resolve();
            }
        });
    }

    private async exists(path: string) {
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
