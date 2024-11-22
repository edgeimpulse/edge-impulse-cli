import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'tsee';
import fs from 'fs';
import Path from 'path';
import os from 'os';
import { spawnHelper } from './spawn-helper';
import { ICamera, ICameraStartOptions } from './icamera';
import crypto from 'crypto';
import util from 'util';

const PREFIX = '\x1b[34m[PRO]\x1b[0m';

export class Prophesee extends EventEmitter<{
    snapshot: (buffer: Buffer, filename: string) => void,
    error: (message: string) => void
}> implements ICamera {
    private _captureProcess?: ChildProcess;
    private _tempDir?: string;
    private _watcher?: fs.FSWatcher;
    private _verbose: boolean;
    private _handledFiles: { [k: string]: true } = { };
    private _lastHash = '';
    private _processing = false;
    private _lastOptions?: ICameraStartOptions;

    /**
     * Instantiate the prophesee backend
     */
    constructor(verbose: boolean) {
        super();

        this._verbose = verbose;
    }

    /**
     * Verify that all dependencies are installed
     */
    async init() {
        try {
            await spawnHelper('which', [ 'prophesee-cam' ]);
        }
        catch (ex) {
            throw new Error('Missing "prophesee-cam" in PATH.');
        }
    }

    /**
     * List all available cameras
     */
    async listDevices() {
        return [ 'Prophesee camera' ];
    }

    /**
     * Start the capture process
     * @param options Specify the camera, and the required interval between snapshots
     */
    async start(options: ICameraStartOptions) {
        if (this._captureProcess) {
            throw new Error('Capture was already started');
        }

        this._lastOptions = options;

        this._tempDir = await fs.promises.mkdtemp(Path.join(os.tmpdir(), 'edge-impulse-cli'));
        const devices = await this.listDevices();
        if (!devices.find(d => d === options.device)) {
            throw new Error('Invalid device ' + options.device);
        }

        let args = [
            '--out-folder', this._tempDir,
            '--fps', (1000 / options.intervalMs).toString()
        ];
        if (options.dimensions) {
            args = args.concat([
                `--width`, options.dimensions.width.toString(),
                `--height`, options.dimensions.height.toString()
            ]);
        }

        this._captureProcess = spawn('prophesee-cam', args, { env: process.env, cwd: this._tempDir });

        if (this._verbose && this._captureProcess.stdout && this._captureProcess.stderr) {
            this._captureProcess.stdout.on('data', (data: Buffer) => {
                console.log(PREFIX, data.toString('utf-8').trim());
            });
            this._captureProcess.stderr.on('data', (data: Buffer) => {
                console.log(PREFIX, data.toString('utf-8').trim());
            });
        }

        let lastPhoto = 0;

        this._watcher = fs.watch(this._tempDir, async (eventType, fileName) => {
            // if (eventType !== 'rename') return;
            if (fileName === null) return;
            if (!(fileName.endsWith('.jpeg') || fileName.endsWith('.jpg'))) return;
            if (!this._tempDir) return;
            if (this._handledFiles[fileName]) return;

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
                        this.emit('snapshot', data, Path.basename(fileName));
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
                    if (this._verbose) {
                        console.log(PREFIX, 'Closed with exit code', code);
                    }

                    if (typeof code === 'number') {
                        reject('Failed to start Prophesee cam, capture process exited with code ' + code + '. ' +
                            'Run with --verbose to see full device logs.');
                    }
                    else {
                        reject('Failed to start capture process, but no exit code. ' +
                            'This might be a permissions issue. ' +
                            'Are you running this command from a simulated shell (like in Visual Studio Code)?');
                    }
                    this._captureProcess = undefined;
                });
            }

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            (async () => {
                if (!this._tempDir) {
                    throw new Error('tempDir is undefined');
                }

                const watcher = fs.watch(this._tempDir, () => {
                    resolve();
                    watcher.close();
                });

                setTimeout(() => {
                    return reject('Did not receive any data from the camera, try restarting ' +
                        'the camera. Or run with --verbose to see full device logs.');
                }, 10000);
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
                }, 5000);
            }
            else {
                resolve();
            }
        });
    }

    getLastOptions() {
        return this._lastOptions;
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
