import { RunnerClassifyResponseSuccess } from "./classifier/linux-impulse-runner";

export class MovingAverageFilter {
    private _filterSize: number;
    private _state: {
        [k: string]: {
            runningSum: number;
            buffer: number[];
            bufferIdx: number;
        }
    } = { };

    /**
     * Create a moving average filter to smooth over results
     * @param filterSize Size of the filter, e.g. number of classifications per second for audio models
     * @param labels All labels in the model
     */
    constructor(filterSize: number, labels: string[]) {
        this._filterSize = filterSize;
        for (let l of labels) {
            this._state[l] = {
                runningSum: 0,
                buffer: Array.from({ length: filterSize }).map(n => 0),
                bufferIdx: 0
            };
        }
    }

    /**
     * Apply the moving average filter over incoming results
     * @param result Classification results
     * @returns Classification results with the filter applied
     */
    run(result: RunnerClassifyResponseSuccess) {
        if (!result.result.classification) {
            throw new Error('Moving average filter is only supported on classification results');
        }

        let updatedResults: { [k: string]: number } = { };

        for (let l of Object.keys(result.result.classification)) {
            let maf = this._state[l];
            if (!maf) {
                throw new Error('Unexpected label "' + l + '" in classification, was not passed into ' +
                    'constructor of the filter');
            }

            maf.runningSum -= maf.buffer[maf.bufferIdx];
            maf.runningSum += Number(result.result.classification[l]);
            maf.buffer[maf.bufferIdx] = Number(result.result.classification[l]);

            if (++maf.bufferIdx >= this._filterSize) {
                maf.bufferIdx = 0;
            }

            updatedResults[l] = maf.runningSum / this._filterSize;
        }

        let r = Object.assign(result.result, {
            classification: updatedResults
        });

        return Object.assign(result, {
            result: r
        });
    }
}