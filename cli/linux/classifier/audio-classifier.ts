import { EventEmitter } from "tsee";
import { AudioInstance, AudioRecorder } from "../sensors/recorder";
import { LinuxImpulseRunner, RunnerClassifyResponseSuccess } from "./linux-impulse-runner";

export class AudioClassifier extends EventEmitter<{
    result: (result: RunnerClassifyResponseSuccess, timeMs: number) => void
    noAudioError: () => void
}> {
    private _runner: LinuxImpulseRunner;
    private _recorder: AudioRecorder | undefined;
    private _audio: AudioInstance | undefined;
    private _stopped = true;
    private _verbose: boolean;

    /**
     * Classifies realtime audio data
     * @param runner An instance of the initialized impulse runner
     * @param verbose Whether to log debug info
     */
    constructor(runner: LinuxImpulseRunner, verbose = false) {
        super();

        this._runner = runner;
        this._verbose = verbose;
    }

    /**
     * Start the audio classifier
     * @param sliceLengthMs Slice length in milliseconds (runs inference every X ms.)
     */
    async start(sliceLengthMs: number) {
        let model = this._runner.getModel();

        if (model.modelParameters.sensorType !== 'microphone') {
            throw new Error('Sensor for this model was not microphone, but ' +
                model.modelParameters.sensorType);
        }

        this._stopped = false;

        this._recorder = new AudioRecorder({
            sampleRate: model.modelParameters.frequency,
            channels: 1,
            asRaw: true,
            recordProgram: 'sox',
            verbose: this._verbose
        });

        this._audio = await this._recorder.start();

        let fullFrameBuffer = Buffer.from([]);

        const fullFrameBytes = model.modelParameters.input_features_count * 2;
        const sliceBytes = (sliceLengthMs / 1000) * model.modelParameters.frequency * 2;

        let firstFrame = true;

        const onData = async (data: Buffer) => {
            fullFrameBuffer = Buffer.concat([ fullFrameBuffer, data ]);

            if (fullFrameBuffer.length >= fullFrameBytes) {
                // one sec slice
                let buffer = fullFrameBuffer.slice(fullFrameBuffer.length - fullFrameBytes);

                let values = [];
                for (let ix = 0; ix < buffer.length; ix += 2) {
                    values.push(buffer.readInt16LE(ix));
                }

                if (firstFrame) {
                    let diff = Math.max(...new Set(values)) - Math.min(...new Set(values));
                    if (diff < 20) {
                        this.emit('noAudioError');
                        if (this._audio) {
                            this._audio.ee.off('data', onData);
                        }
                    }
                    firstFrame = false;
                }

                // console.log('data in', values);

                // retain the last X ms (without the slice).
                fullFrameBuffer = fullFrameBuffer.slice((fullFrameBuffer.length - (fullFrameBytes - sliceBytes)));

                let now = Date.now();

                if (this._stopped) return;

                let classifyRes = await this._runner.classify(values);

                let timeSpent = Date.now() - now;

                this.emit('result', classifyRes, timeSpent);
            }
        };

        this._audio.ee.on('data', onData);
    }

    /**
     * Stop the audio classifier
     */
    async stop() {
        this._stopped = true;

        await Promise.all([
            this._audio ? this._audio.stop() : Promise.resolve(),
            this._runner.stop()
        ]);
    }
}
