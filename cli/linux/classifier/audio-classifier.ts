import { EventEmitter } from "tsee";
import { AudioInstance, AudioRecorder } from "../recorder";
import { LinuxImpulseRunner, RunnerClassifyResponseSuccess } from "./linux-impulse-runner";

export class AudioClassifier extends EventEmitter<{
    result: (result: RunnerClassifyResponseSuccess, timeMs: number) => void
}> {
    private _runner: LinuxImpulseRunner;
    private _recorder: AudioRecorder | undefined;
    private _audio: AudioInstance | undefined;

    constructor(runner: LinuxImpulseRunner) {
        super();

        this._runner = runner;
    }

    /**
     * Start the audio classifier
     * @param sliceLengthMs Slice length in milliseconds (runs inference every X ms.)
     */
    async start(sliceLengthMs: number) {
        let model = this._runner.getModel();

        if (model.modelParameters.sensorType !== 'microphone') {
            throw new Error('Sensor for this model was not microphone, but ' +
                model.modelParameters.sensor);
        }

        this._recorder = new AudioRecorder({
            sampleRate: model.modelParameters.frequency,
            channels: 1,
            asRaw: true
        });

        this._audio = await this._recorder.start();

        let fullFrameBuffer = Buffer.from([]);

        const fullFrameBytes = model.modelParameters.input_features_count * 2;
        const sliceBytes = (sliceLengthMs / 1000) * model.modelParameters.frequency * 2;

        this._audio.ee.on('data', async (data) => {
            fullFrameBuffer = Buffer.concat([ fullFrameBuffer, data ]);
            if (fullFrameBuffer.length >= fullFrameBytes) {
                // one sec slice
                let buffer = fullFrameBuffer.slice(fullFrameBuffer.length - 32000);

                let values = [];
                for (let ix = 0; ix < buffer.length; ix += 2) {
                    values.push(buffer.readInt16LE(ix));
                }

                // console.log('data in', values);

                // retain the last X ms (without the slice).
                fullFrameBuffer = fullFrameBuffer.slice((fullFrameBuffer.length - (fullFrameBytes - sliceBytes)));

                let now = Date.now();

                let classifyRes = await this._runner.classify(values);

                let timeSpent = Date.now() - now;

                this.emit('result', classifyRes, timeSpent);
            }
        });
    }

    async stop() {
        await Promise.all([
            this._audio ? this._audio.stop() : Promise.resolve(),
            this._runner.stop()
        ]);
    }
}
