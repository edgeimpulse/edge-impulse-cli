import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'tsee';
import fs from 'fs';
import Path from 'path';
import os from 'os';
import { spawnHelper } from './spawn-helper';
import { ICamera, ICameraStartOptions } from './icamera';

const PREFIX = '\x1b[35m[SNP]\x1b[0m';

export class Imagesnap extends EventEmitter<{
    snapshot: (buffer: Buffer, filename: string) => void,
    error: (message: string) => void
}> implements ICamera {
    private _captureProcess?: ChildProcess;
    private _tempDir?: string;
    private _watcher?: fs.FSWatcher;
    private _lastOptions?: ICameraStartOptions;
    private _keepAliveTimeout: NodeJS.Timeout | undefined;
    private _verbose: boolean;
    private _isStarted = false;
    private _isRestarting = false;

    /**
     * Instantiate the imagesnap backend (on macOS)
     */
    constructor(verbose: boolean = false) {
        super();

        this._verbose = verbose;
    }

    /**
     * Verify that all dependencies are installed
     */
    async init() {
        try {
            await spawnHelper('which', [ 'imagesnap' ]);
        }
        catch (ex) {
            throw new Error('Missing "imagesnap" in PATH. Install via `brew install imagesnap`');
        }
    }

    /**
     * List all available cameras
     */
    async listDevices() {
        let devices = await spawnHelper('imagesnap', [ '-l' ]);
        let names = devices.split('\n').filter(l => l.startsWith('<') || l.startsWith('=>')).map(l => {
            // Big Sur
            if (l.startsWith('=>')) {
                return l.substr(3).trim();
            }

            // Catalina
            let name = l.split('[')[1];
            return name.substr(0, name.length - 1);
        });

        return names;
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

        this._captureProcess = spawn('imagesnap', [
            '-d', options.device,
            '-t', (options.intervalMs / 1000).toString()
        ], { cwd: this._tempDir });

        if (this._verbose) {
            console.log(PREFIX, 'Starting with:', [ 'imagesnap',
                '-d', options.device,
                '-t', (options.intervalMs / 1000).toString()
            ].join(' '));
        }

        const launchStdout = (data: Buffer) => {
            if (this._verbose) {
                console.log(PREFIX, data.toString('utf-8'));
            }
        };

        if (this._captureProcess.stdout) {
            this._captureProcess.stdout.on('data', launchStdout);
        }
        if (this._captureProcess.stderr) {
            this._captureProcess.stderr.on('data', launchStdout);
        }

        this._watcher = fs.watch(this._tempDir, async (eventType, fileName) => {
            if (eventType === 'rename' && fileName !== null && fileName.endsWith('.jpg') && this._tempDir) {
                if (this._keepAliveTimeout) {
                    clearTimeout(this._keepAliveTimeout);
                }

                try {
                    let data = await fs.promises.readFile(Path.join(this._tempDir, fileName));
                    this.emit('snapshot', data, Path.basename(fileName));

                    // 2 seconds no new data? trigger timeout
                    if (this._keepAliveTimeout) {
                        clearTimeout(this._keepAliveTimeout);
                    }
                    this._keepAliveTimeout = setTimeout(() => {
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        this.timeoutCallback();
                    }, 2000);
                }
                catch (ex) {
                    console.error('Failed to load file', Path.join(this._tempDir, fileName));
                }
            }
        });

        let startRes = new Promise<void>((resolve, reject) => {
            if (this._captureProcess) {
                let cp = this._captureProcess;

                this._captureProcess.on('close', code => {
                    if (this._keepAliveTimeout) {
                        clearTimeout(this._keepAliveTimeout);
                    }

                    if (typeof code === 'number') {
                        reject('Capture process failed with code ' + code);
                    }
                    else {
                        reject('Failed to start capture process, but no exit code. ' +
                            'This might be a permissions issue. ' +
                            'Are you running this command from a simulated shell (like in Visual Studio Code)?');
                    }

                    // already started and we're the active process?
                    if (this._isStarted && cp === this._captureProcess && !this._isRestarting) {
                        this.emit('error', 'imagesnap process was killed with code (' + code + ')');
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
                    if (this._keepAliveTimeout) {
                        clearTimeout(this._keepAliveTimeout);
                    }

                    return reject('First photo was not created within 10 seconds');
                }, 10000);
            })();
        });

        // don't log anymore after process is launched / exited
        const clearLaunchStdout = () => {
            if (!this._captureProcess) return;

            if (this._captureProcess.stdout) {
                this._captureProcess.stdout.off('data', launchStdout);
            }
            if (this._captureProcess.stderr) {
                this._captureProcess.stderr.off('data', launchStdout);
            }
        };

        startRes.then(() => {
            clearLaunchStdout();
            this._isStarted = true;
        }).catch(clearLaunchStdout);

        return startRes;
    }

    async stop() {
        if (this._keepAliveTimeout) {
            clearTimeout(this._keepAliveTimeout);
        }

        let stopRes = new Promise<void>((resolve) => {
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
                }, 500);
            }
            else {
                resolve();
            }
        });

        // set isStarted to false
        stopRes
            .then(() => { this._isStarted = false; })
            .catch(() => { this._isStarted = false; });

        return stopRes;
    }

    getLastOptions() {
        return this._lastOptions;
    }

    private async timeoutCallback() {
        try {
            this._isRestarting = true;

            if (this._verbose) {
                console.log(PREFIX, 'No images received for 2 seconds, restarting...');
            }
            await this.stop();
            if (this._verbose) {
                console.log(PREFIX, 'Stopped');
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
            if (this._lastOptions) {
                if (this._verbose) {
                    console.log(PREFIX, 'Starting imagesnap processing...');
                }
                await this.start(this._lastOptions);
                if (this._verbose) {
                    console.log(PREFIX, 'Restart completed');
                }
            }
            else {
                this.emit('error', 'imagesnap process went stale');
            }
        }
        catch (ex2) {
            let ex = <Error>ex2;
            this.emit('error', 'imagesnap failed to restart: ' + (ex.message || ex.toString()));
        }
        finally {
            this._isRestarting = false;
        }
    }
}
