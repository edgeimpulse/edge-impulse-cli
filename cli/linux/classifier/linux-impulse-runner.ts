import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { EventEmitter } from 'tsee';
import util from 'util';

type RunnerErrorResponse = {
    success: false;
    error: string;
};

type RunnerHelloRequest = {
    hello: 1;
};

export type RunnerHelloResponseModelParameters = {
    frequency: number;
    has_anomaly: number;
    input_features_count: number;
    image_input_height: number;
    image_input_width: number;
    image_channel_count: number;
    interval_ms: number;
    label_count: number;
    sensor: number;
    labels: string[];
};

export type RunnerHelloResponseProject = {
    deploy_version: number;
    id: number;
    name: string;
    owner: string;
};

type RunnerHelloResponse = {
    model_parameters: RunnerHelloResponseModelParameters;
    project: RunnerHelloResponseProject;
    success: true;
} | RunnerErrorResponse;

type RunnerClassifyRequest = {
    classify: number[];
};

export type RunnerClassifyResponseSuccess = {
    classification: { [k: string]: number };
    timing: {
        dsp: number;
        classification: number;
        anomaly: number;
    };
    anomaly?: number;
};

type RunnerClassifyResponse = {
    success: true;
    result: RunnerClassifyResponseSuccess;
} | RunnerErrorResponse;

export class LinuxImpulseRunner {
    private _path: string;
    private _runner: ChildProcess | undefined;
    private _helloResponse: ({
        modelParameters: RunnerHelloResponseModelParameters & {
            sensorType: 'unknown' | 'accelerometer' | 'microphone' | 'camera'
        };
        project: RunnerHelloResponseProject;
    }) | undefined;
    private _runnerEe = new EventEmitter<{
        message: (data: { id: number }) => void,
        error: (err: string) => void
    }>();
    private _id = 0;
    private _stopped = false;

    /**
     * Start a new impulse runner
     * @param path Path to the runner's executable
     */
    constructor(path: string) {
        this._path = path;
    }

    /**
     * Initialize the runner
     * This returns information about the model
     */
    async init() {
        if (!await this.exists(this._path)) {
            throw new Error('Runner does not exist: ' + this._path);
        }

        this._runner = spawn(this._path);

        let bracesOpen = 0;
        let bracesClosed = 0;
        let line = '';

        this._runner.stdout.on('data', (data: Buffer) => {
            // uncomment this to see raw output
            // console.log('data', data.toString('utf-8'));
            for (let c of data.toString('utf-8').split('')) {
                line += c;

                if (c === '{') {
                    bracesOpen++;
                }
                else if (c === '}') {
                    bracesClosed++;
                    if (bracesClosed === bracesOpen) {
                        try {
                            let resp = <{ id: number }>JSON.parse(line);
                            this._runnerEe.emit('message', resp);
                        }
                        catch (ex2) {
                            let ex = <Error>ex2;
                            this._runnerEe.emit('error', ex.message || ex.toString());
                        }

                        line = '';
                        bracesClosed = 0;
                        bracesOpen = 0;
                    }
                }
                else if (bracesOpen === 0) {
                    line = line.substr(0, line.length - 1);
                }
            }
        });

        this._runner.on('exit', code => {
            if (typeof code === 'number' && code !== 0) {
                this._runnerEe.emit('error', 'Runner has exited with code ' + code);
            }
            this._runner = undefined;
            this._helloResponse = undefined;
            this._runnerEe.removeAllListeners();
        });

        return await this.sendHello();
    }

    async stop() {
        this._stopped = true;

        if (!this._runner) {
            return Promise.resolve();
        }

        return new Promise < void > ((resolve) => {
            if (this._runner) {
                this._runner.on('close', code => {
                    resolve();
                });
                this._runner.kill('SIGINT');
                setTimeout(() => {
                    if (this._runner) {
                        this._runner.kill('SIGHUP');
                    }
                }, 500);
            } else {
                resolve();
            }
        });
    }

    getModel() {
        if (!this._helloResponse) {
            throw new Error('Runner is not initialized');
        }

        return this._helloResponse;
    }

    /**
     * Classify data
     * @param data An array of numbers, already formatted according to the rules in
     *             https://docs.edgeimpulse.com/docs/running-your-impulse-locally-1
     */
    async classify(data: number[]): Promise<RunnerClassifyResponseSuccess> {
        let resp = await this.send<RunnerClassifyRequest, RunnerClassifyResponse>({ classify: data });
        if (!resp.success) {
            throw new Error(resp.error);
        }
        return resp.result;
    }

    private async sendHello() {
        let resp = await this.send<RunnerHelloRequest, RunnerHelloResponse>({ hello: 1 });
        if (!resp.success) {
            throw new Error(resp.error);
        }

        let sensor: 'unknown' | 'accelerometer' | 'microphone' | 'camera' = 'unknown';
        switch (resp.model_parameters.sensor) {
            case -1:
            default:
                sensor = 'unknown'; break;
            case 1:
                sensor = 'microphone'; break;
            case 2:
                sensor = 'accelerometer'; break;
            case 3:
                sensor = 'camera'; break;
        }

        let data = {
            project: resp.project,
            modelParameters: { ...resp.model_parameters, sensorType: sensor }
        };

        this._helloResponse = data;

        return data;
    }

    private send<T, U>(msg: T) {
        return new Promise<U>((resolve, reject) => {
            if (!this._runner) {
                return reject('Runner is not initialized');
            }

            let msgId = ++this._id;
            this._runner.stdin.write(JSON.stringify(Object.assign(msg, {
                id: msgId
            })) + '\n');

            const onData = (resp: { id: number }) => {
                if (this._runner && resp.id === msgId) {
                    this._runner.off('exit', onExit);
                    this._runnerEe.off('message', onData);
                    resolve(<U><unknown>resp);
                }
            };

            this._runnerEe.on('message', onData);

            setTimeout(() => {
                reject('No response within 5 seconds');
            }, 5000);

            const onExit = (code: number) => {
                if (!this._stopped) {
                    reject('Process exited with ' + code);
                }
            };

            this._runner.on('exit', onExit);
        });
    }

    /**
     * Whether a file exists (Node.js API cannot be converted using promisify)
     * @param path
     */
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
