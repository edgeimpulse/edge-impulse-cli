import { EventEmitter } from "tsee";
import { LinuxImpulseRunner, ModelInformation, RunnerClassifyResponseSuccess } from "./linux-impulse-runner";
import sharp, { FitEnum } from 'sharp';
import { ICamera } from "../sensors/icamera";

export class ImageClassifier extends EventEmitter<{
    result: (result: RunnerClassifyResponseSuccess, timeMs: number, imgAsJpeg: Buffer) => void
}> {
    private _runner: LinuxImpulseRunner;
    private _camera: ICamera;
    private _stopped: boolean = true;
    private _runningInference = false;
    private _model: ModelInformation;

    /**
     * Classifies realtime image data from a camera
     * @param runner An initialized impulse runner instance
     * @param camera An initialized ICamera instance
     */
    constructor(runner: LinuxImpulseRunner, camera: ICamera) {
        super();

        this._runner = runner;
        this._camera = camera;
        this._model = runner.getModel();
    }

    /**
     * Start the image classifier
     */
    async start() {
        if (this._model.modelParameters.sensorType !== 'camera') {
            throw new Error('Sensor for this model was not camera, but ' +
                this._model.modelParameters.sensor);
        }

        this._stopped = false;

        let frameQueue: { features: number[], img: sharp.Sharp }[] = [];

        this._camera.on('snapshot', async (data) => {
            let model = this._model;
            if (this._stopped) {
                return;
            }

            // are we looking at video? Then we always add to the frameQueue
            if (model.modelParameters.image_input_frames > 1) {
                let resized = await ImageClassifier.resizeImage(model, data);
                frameQueue.push(resized);
            }

            // still running inferencing?
            if (this._runningInference) {
                return;
            }

            // too little frames? then wait for next one
            if (model.modelParameters.image_input_frames > 1 &&
                frameQueue.length < model.modelParameters.image_input_frames) {
                return;
            }

            this._runningInference = true;

            try {
                // if we have single frame then resize now
                if (model.modelParameters.image_input_frames > 1) {
                    frameQueue = frameQueue.slice(frameQueue.length - model.modelParameters.image_input_frames);
                }
                else {
                    let resized = await ImageClassifier.resizeImage(model, data);
                    frameQueue = [ resized ];
                }

                let img = frameQueue[frameQueue.length - 1].img;

                // slice the frame queue
                frameQueue = frameQueue.slice(frameQueue.length - model.modelParameters.image_input_frames);

                // concat the frames
                let values: number[] = [];
                for (let ix = 0; ix < model.modelParameters.image_input_frames; ix++) {
                    values = values.concat(frameQueue[ix].features);
                }

                let now = Date.now();

                if (this._stopped) {
                    return;
                }

                let classifyRes = await this._runner.classify(values);

                let timeSpent = Date.now() - now;

                let timingMs = classifyRes.timing.dsp + classifyRes.timing.classification + classifyRes.timing.anomaly;
                if (timingMs === 0) {
                    timingMs = 1;
                }

                this.emit('result', classifyRes,
                    timingMs,
                    await img.jpeg({ quality: 90 }).toBuffer());
            }
            finally {
                this._runningInference = false;
            }
        });
    }

    resume() {
        // reload the model info
        this._model = this._runner.getModel();
        this._stopped = false;
        // reset the inference flag (in case we were paused during inference)
        this._runningInference = false;
    }

    pause() {
        this._stopped = true;
    }

    /**
     * Stop the classifier
     */
    async stop() {
        this._stopped = true;

        await Promise.all([
            this._camera ? this._camera.stop() : Promise.resolve(),
            this._runner.stop()
        ]);
    }

    getRunner() {
        return this._runner;
    }

    static async resizeImage(model: ModelInformation, data: Buffer, fitMethod?: keyof FitEnum) {
        const metadata = await sharp(data).metadata();
        if (!metadata.width) {
            throw new Error('ImageClassifier.resize: cannot determine width of image');
        }
        if (!metadata.height) {
            throw new Error('ImageClassifier.resize: cannot determine height of image');
        }

        // resize image and add to frameQueue
        let img;
        let features: number[] = [];
        if (model.modelParameters.image_channel_count === 3) {
            img = sharp(data).resize({
                height: model.modelParameters.image_input_height,
                width: model.modelParameters.image_input_width,
                fit: fitMethod,
                fastShrinkOnLoad: false
            }).removeAlpha();
            let buffer = await img.raw().toBuffer();

            for (let ix = 0; ix < buffer.length; ix += 3) {
                let r = buffer[ix + 0];
                let g = buffer[ix + 1];
                let b = buffer[ix + 2];
                // eslint-disable-next-line no-bitwise
                features.push((r << 16) + (g << 8) + b);
            }
        }
        else {
            img = sharp(data).resize({
                height: model.modelParameters.image_input_height,
                width: model.modelParameters.image_input_width,
                fit: fitMethod,
                fastShrinkOnLoad: false
            }).toColourspace('b-w');
            let buffer = await img.raw().toBuffer();

            for (let p of buffer) {
                // eslint-disable-next-line no-bitwise
                features.push((p << 16) + (p << 8) + p);
            }
        }

        // await fs.promises.writeFile('debug.png', await img.png().toBuffer());
        // await fs.promises.writeFile('features.txt', features.map(x => '0x' + x.toString(16)).join(', '), 'utf-8');

        return {
            img: img,
            features: features,
            originalWidth: metadata.width,
            originalHeight: metadata.height,
            newWidth: model.modelParameters.image_input_width,
            newHeight: model.modelParameters.image_input_height,
        };
    }
}
