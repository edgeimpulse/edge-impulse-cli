import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import { EventEmitter } from 'tsee';
import util from 'util';
import os from 'os';
import Path from 'path';
import net from 'net';

type RunnerErrorResponse = {
    success: false;
    error: string;
};

type RunnerHelloRequest = {
    hello: 1;
};

export enum RunnerHelloHasAnomaly {
    None = 0,
    KMeans = 1,
    GMM = 2,
    VisualGMM = 3,
}

export enum RunnerHelloInferencingEngine {
    None = 255,
    Utensor = 1,
    Tflite = 2,
    Cubeai = 3,
    TfliteFull = 4,
    TensaiFlow = 5,
    TensorRT = 6,
    Drpai = 7,
    TfliteTidl = 8,
    Akida = 9,
    Syntiant = 10,
    OnnxTidl = 11,
    Memryx = 12,
}

export type RunnerHelloResponseModelParameters = {
    axis_count: number;
    frequency: number;
    has_anomaly: RunnerHelloHasAnomaly;
    /**
     * NOTE: This field is _experimental_. It might change when object tracking
     * is released publicly.
     */
    has_object_tracking?: boolean;
    input_features_count: number;
    image_input_height: number;
    image_input_width: number;
    image_input_frames: number;
    image_channel_count: number;
    image_resize_mode?: 'none' | 'fit-shortest' | 'fit-longest' | 'squash';
    interval_ms: number;
    label_count: number;
    sensor: number;
    labels: string[];
    model_type: 'classification' | 'object_detection' | 'constrained_object_detection';
    slice_size: undefined | number;
    use_continuous_mode: undefined | boolean;
    inferencing_engine?: undefined | RunnerHelloInferencingEngine;
    thresholds: ({
        id: number,
        type: 'anomaly_gmm',
        min_anomaly_score: number,
    } | {
        id: number,
        type: 'object_detection',
        min_score: number,
    } | {
        id: number,
        type: 'object_tracking',
        keep_grace: number,
        max_observations: number,
        threshold: number,
    })[] | undefined,
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

type RunnerClassifyContinuousRequest = {
    classify_continuous: number[];
};

export type RunnerClassifyResponseSuccess = {
    result: {
        classification?: { [k: string]: number };
        bounding_boxes?: {
            label: string,
            value: number,
            x: number,
            y: number,
            width: number,
            height: number,
        }[],
        /**
         * NOTE: This field is _experimental_. It might change when object tracking
         * is released publicly.
         */
        object_tracking?: {
            object_id: number,
            label: string,
            value: number,
            x: number,
            y: number,
            width: number,
            height: number,
        }[],
        visual_anomaly_grid?: {
            label: string,
            value: number,
            x: number,
            y: number,
            width: number,
            height: number,
        }[],
        visual_anomaly_max?: number;
        visual_anomaly_mean?: number;
        anomaly?: number;
    },
    timing: {
        dsp: number;
        classification: number;
        anomaly: number;
    },
    info?: string;
};

type RunnerClassifyResponse = ({
    success: true;
} & RunnerClassifyResponseSuccess) | RunnerErrorResponse;

type RunnerSetThresholdRequest = {
    set_threshold: {
        id: number,
        min_anomaly_score: number,
    } | {
        id: number,
        min_score: number,
    } | {
        id: number,
        keep_grace: number,
        max_observations: number,
        threshold: number,
    };
};

type RunnerSetThresholdResponse = { success: true } | RunnerErrorResponse;

export type ModelInformation = {
    project: RunnerHelloResponseProject,
    modelParameters: RunnerHelloResponseModelParameters & {
        sensorType: 'unknown' | 'accelerometer' | 'microphone' | 'camera' | 'positional'
    }
};

export class LinuxImpulseRunner {
    private _path: string;
    private _runner: ChildProcess | undefined;
    private _helloResponse: ModelInformation | undefined;
    private _runnerEe = new EventEmitter<{
        message: (data: { id: number }) => void,
        error: (err: string) => void
    }>();
    private _id = 0;
    private _stopped = false;
    private _socket: net.Socket | undefined;

    /**
     * Start a new impulse runner
     * @param path Path to the runner's executable
     */
    constructor(path: string) {
        this._path = Path.resolve(path);
    }

    /**
     * Initialize the runner
     * This returns information about the model
     */
    async init(modelPath?: string) {
        if (modelPath) {
            this._path = Path.resolve(modelPath);
        }

        if (!await this.exists(this._path)) {
            throw new Error('Runner does not exist: ' + this._path);
        }

        let isSocket = (await fs.promises.stat(this._path)).isSocket();

        // if we have /dev/shm, use that (RAM backed, instead of SD card backed, better for wear)
        let osTmpDir = os.tmpdir();
        if (await this.exists('/dev/shm')) {
            osTmpDir = '/dev/shm';
        }

        let socketPath: string;
        if (isSocket) {
            socketPath = this._path;
        }
        else {
            let tempDir = await fs.promises.mkdtemp(Path.join(osTmpDir, 'edge-impulse-cli'));
            socketPath = Path.join(tempDir, 'runner.sock');

            // start the .eim file
            if (this._runner && this._runner.pid) {
                // kill the runner
                this._runner.kill('SIGINT');
                // TODO: check if the runner still exists
            }
            this._runner = spawn(this._path, [ socketPath ]);

            if (!this._runner.stdout) {
                throw new Error('stdout is null');
            }

            const onStdout = (data: Buffer) => {
                stdout += data.toString('utf-8');
            };

            let stdout = '';
            this._runner.stdout.on('data', onStdout);
            if (this._runner.stderr) {
                this._runner.stderr.on('data', onStdout);
            }

            let exitCode: number | undefined | null;

            this._runner.on('exit', code => {
                exitCode = code;
                if (typeof code === 'number' && code !== 0) {
                    this._runnerEe.emit('error', 'Runner has exited with code ' + code);
                }
                this._runner = undefined;
                this._helloResponse = undefined;
                this._runnerEe.removeAllListeners();
            });

            while (typeof exitCode === 'undefined' && !await this.exists(socketPath)) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            if (typeof exitCode !== 'undefined') {
                let err = 'Failed to start runner (code: ' + exitCode + '): ' + stdout;
                if (stdout.indexOf('libtensorflowlite_flex') > -1) {
                    err += '\n\n' +
                        'You will need to install the flex delegates ' +
                        'shared library to run this model. Learn more at https://docs.edgeimpulse.com/docs/edge-impulse-for-linux/flex-delegates';
                }
                throw new Error(err);
            }

            this._runner?.stdout.off('data', onStdout);
            if (this._runner?.stderr) {
                this._runner.stderr.off('data', onStdout);
            }
        }

        // attach to the socket
        let bracesOpen = 0;
        let bracesClosed = 0;
        let line = '';

        if (this._socket) {
            this._socket.removeAllListeners();
            this._socket.end();
        }

        this._socket = net.connect(socketPath);
        this._socket.on('data', data => {
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

        this._socket.on('error', error => {
            this._runnerEe.emit('error', error.message || error.toString());
        });

        await new Promise((resolve, reject) => {
            this._socket?.once('connect', resolve);
            this._socket?.once('error', reject);

            setTimeout(() => {
                reject('Timeout when connecting to ' + socketPath);
            }, 10000);
        });

        let helloResp = await this.sendHello();

        if (helloResp.modelParameters.inferencing_engine === RunnerHelloInferencingEngine.TensorRT) {
            await this.runTensorRTWarmup(helloResp.modelParameters);
        }

        return helloResp;
    }

    /**
     * Stop the classification process
     */
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
                }, 3000);
            }
            else {
                resolve();
            }
        });
    }

    /**
     * Get information about the model, this is only available
     * after the runner has been initialized
     */
    getModel() {
        if (!this._helloResponse) {
            console.trace('getModel() runner is not initialized');
            throw new Error('Runner is not initialized');
        }

        return this._helloResponse;
    }

    /**
     * Classify data
     * @param data An array of numbers, already formatted according to the rules in
     *             https://docs.edgeimpulse.com/docs/running-your-impulse-locally-1
     */
    async classify(data: number[], timeout?: number): Promise<RunnerClassifyResponseSuccess> {
        let resp = await this.send<RunnerClassifyRequest, RunnerClassifyResponse>({ classify: data }, timeout);
        if (!resp.success) {
            throw new Error(resp.error);
        }
        return {
            result: resp.result,
            timing: resp.timing,
            info: resp.info
        };
    }

    /**
     * Classify data (continuous mode, pass in slice_size data)
     * @param data An array of numbers, already formatted according to the rules in
     *             https://docs.edgeimpulse.com/docs/running-your-impulse-locally-1
     */
    async classifyContinuous(data: number[]): Promise<RunnerClassifyResponseSuccess> {
        let resp = await this.send<RunnerClassifyContinuousRequest, RunnerClassifyResponse>({
            classify_continuous: data,
        });
        if (!resp.success) {
            throw new Error(resp.error);
        }
        return {
            result: resp.result,
            timing: resp.timing,
            info: resp.info
        };
    }

    async setLearnBlockThreshold(obj: {
        id: number,
        type: 'anomaly_gmm',
        min_anomaly_score: number,
    } | {
        id: number,
        type: 'object_detection',
        min_score: number,
    } | {
        id: number,
        type: 'object_tracking',
        keep_grace: number,
        max_observations: number,
        threshold: number,
    }) {
        let resp: RunnerSetThresholdResponse;
        if (obj.type === 'anomaly_gmm') {
            resp = await this.send<RunnerSetThresholdRequest, RunnerSetThresholdResponse>({
                set_threshold: {
                    id: obj.id,
                    min_anomaly_score: obj.min_anomaly_score,
                }
            });
        }
        else if (obj.type === 'object_detection') {
            resp = await this.send<RunnerSetThresholdRequest, RunnerSetThresholdResponse>({
                set_threshold: {
                    id: obj.id,
                    min_score: obj.min_score,
                }
            });
        }
        else if (obj.type === 'object_tracking') {
            resp = await this.send<RunnerSetThresholdRequest, RunnerSetThresholdResponse>({
                set_threshold: {
                    id: obj.id,
                    keep_grace: obj.keep_grace,
                    max_observations: obj.max_observations,
                    threshold: obj.threshold,
                }
            });
        }
        else {
            throw new Error(`runner::setLearnBlockThreshold invalid value for type (was "${(<{ type: string }>obj).type}")`);
        }
    }

    private async sendHello() {
        let resp = await this.send<RunnerHelloRequest, RunnerHelloResponse>({ hello: 1 });
        if (!resp.success) {
            throw new Error(resp.error);
        }

        let sensor: 'unknown' | 'accelerometer' | 'microphone' | 'camera' | 'positional' = 'unknown';
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
            case 4:
                sensor = 'positional'; break;
        }

        let data: ModelInformation = {
            project: resp.project,
            modelParameters: { ...resp.model_parameters, sensorType: sensor }
        };

        if (!data.modelParameters.model_type) {
            data.modelParameters.model_type = 'classification';
        }
        if (typeof data.modelParameters.image_input_frames === 'undefined') {
            data.modelParameters.image_input_frames = 1;
        }

        this._helloResponse = data;

        return data;
    }

    private send<T extends object, U>(msg: T, timeoutArg?: number) {

        return new Promise<U>((resolve, reject) => {
            let timeout = typeof timeoutArg === 'number' ? timeoutArg : 5000;

            if (!this._socket) {
                console.trace('Runner is not initialized (runner.send)');
                return reject('Runner is not initialized');
            }

            let msgId = ++this._id;

            const onData = (resp: { id: number }) => {
                if (resp.id === msgId) {
                    if (this._runner) {
                        this._runner.off('exit', onExit);
                    }
                    this._runnerEe.off('message', onData);
                    resolve(<U><unknown>resp);
                }
            };

            this._runnerEe.on('message', onData);

            this._socket.write(JSON.stringify(Object.assign(msg, {
                id: msgId
            })) + '\n');

            setTimeout(() => {
                reject(`'No response within ${timeout / 1000} seconds'`);
            }, timeout);

            const onExit = (code: number) => {
                if (!this._stopped) {
                    reject('Process exited with ' + code);
                }
            };

            if (this._runner) {
                this._runner.on('exit', onExit);
            }
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

    private async runTensorRTWarmup(params: RunnerHelloResponseModelParameters) {
        const PREFIX = '\x1b[33m[TRT]\x1b[0m';

        const spinner = [ "|", "/", "-", "\\" ];
        let progressIv: NodeJS.Timeout | undefined;
        try {
            let i = 0;
            progressIv = setInterval(() => {
                console.log(PREFIX, 'Loading model into GPU, this can take several minutes on the first run... ' +
                    spinner[i] + '\x1b[1A');
                i = (i < spinner.length - 1) ? i + 1 : 0;
            }, 1000);

            let initStart = Date.now();

            await this.classify(<number[]>Array.from({ length: params.input_features_count }).fill(0),
                60 * 60 * 1000 /* 1 hour */);

            let totalTime = Date.now() - initStart;

            if (progressIv) {
                clearInterval(progressIv);
            }

            console.log(PREFIX, 'Loading model into GPU, this can take several minutes on the first run... ' +
                'OK (' + totalTime + 'ms.)');

            if (totalTime > 5000) {
                // https://stackoverflow.com/questions/20010199/how-to-determine-if-a-process-runs-inside-lxc-docker
                if (await this.exists('/.dockerenv')) {
                    console.log(PREFIX, '');
                    console.log(PREFIX, 'If you run this model in Docker you can cache the GPU-optimized model for faster startup times');
                    console.log(PREFIX, 'by mounting the', + Path.dirname(this._path), 'directory into the container.');
                    console.log(PREFIX, 'See https://docs.edgeimpulse.com/docs/run-inference/docker#running-offline');
                    console.log(PREFIX, '');
                }
            }
        }
        catch (ex2) {
            const ex = <Error>ex2;
            console.log(''); // make sure to jump to next line
            throw ex;
        }
        finally {
            if (progressIv) {
                clearInterval(progressIv);
            }
        }
    }
}
