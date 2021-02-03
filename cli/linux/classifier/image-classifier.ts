import { EventEmitter } from "tsee";
import { Imagesnap } from "../imagesnap";
import { LinuxImpulseRunner, RunnerClassifyResponseSuccess } from "./linux-impulse-runner";
import sharp from 'sharp';

export class ImageClassifier extends EventEmitter<{
    result: (result: RunnerClassifyResponseSuccess, timeMs: number) => void
}> {
    private _runner: LinuxImpulseRunner;
    private _imagesnap: Imagesnap;

    constructor(runner: LinuxImpulseRunner, imagesnap: Imagesnap) {
        super();

        this._runner = runner;
        this._imagesnap = imagesnap;
    }

    /**
     * Start the image classifier
     */
    async start() {
        let model = this._runner.getModel();

        if (model.modelParameters.sensorType !== 'camera') {
            throw new Error('Sensor for this model was not camera, but ' +
                model.modelParameters.sensor);
        }

        this._imagesnap.on('snapshot', async (data) => {
            // sharp already auto-crops!

            let values: number[] = [];
            if (model.modelParameters.image_channel_count === 3) {
                let buffer = await sharp(data).resize({
                    height: model.modelParameters.image_input_height,
                    width: model.modelParameters.image_input_width
                }).raw().toBuffer();

                for (let ix = 0; ix < buffer.length; ix += 3) {
                    let r = buffer[ix + 0];
                    let g = buffer[ix + 1];
                    let b = buffer[ix + 2];
                    // tslint:disable-next-line: no-bitwise
                    values.push((r << 16) + (g << 8) + b);
                }
            }
            else {
                let buffer = await sharp(data).resize({
                    height: model.modelParameters.image_input_height,
                    width: model.modelParameters.image_input_width
                }).raw().toColourspace('b-w').toBuffer();

                for (let p of buffer) {
                    // tslint:disable-next-line: no-bitwise
                    values.push((p << 16) + (p << 8) + p);
                }
            }

            let now = Date.now();

            let classifyRes = await this._runner.classify(values);

            let timeSpent = Date.now() - now;

            this.emit('result', classifyRes, timeSpent);
        });
    }

    async stop() {
        await Promise.all([
            this._imagesnap ? this._imagesnap.stop() : Promise.resolve(),
            this._runner.stop()
        ]);
    }
}
