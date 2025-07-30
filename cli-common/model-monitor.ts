import fs from 'fs/promises';
import Path from 'path';
import { Config } from './config';
import { RunnerClassifyResponseSuccess, RunnerHelloHasAnomaly } from "../library/classifier/linux-impulse-runner";
import { ModelInformation } from '../library/classifier/linux-impulse-runner';
import { EventEmitter } from 'tsee';
import { MgmtInterfaceImpulseRecordRawData, MgmtInterfaceInferenceSummary } from '../shared/MgmtInterfaceTypes';

export const DEFAULT_MONITOR_SUMMARY_INTERVAL_MS = 60000;
const MONITOR_PREFIX = '\x1b[34m[MON]\x1b[0m';

function checkFileExists(file: string) {
    return new Promise(resolve => {
        return fs.access(file, fs.constants.F_OK)
            .then(() => resolve(true))
            .catch(() => resolve(false));
    });
}

async function asyncPool<IN, OUT>(poolLimit: number, array: ReadonlyArray<IN>,
    iteratorFn: (generator: IN) => Promise <OUT>): Promise<OUT[]> {
    const ret = [];
    const executing: Promise<OUT>[] = [];
    for (const item of array) {
        const p = Promise.resolve().then(() => iteratorFn(item));
        ret.push(p);

        if (poolLimit <= array.length) {
            const e = <Promise<OUT>>p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= poolLimit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(ret);
}

export type ImpulseRecord = {
    impulseRecord: RunnerClassifyResponseSuccess;
    timestamp: number;
    index: number;
    rawData: MgmtInterfaceImpulseRecordRawData;
};

export type ImpulseRecordError = {
    index: number;
    error: string;
};

export type StorageStatus = {
    firstIndex: number;
    firstTimestamp: number;
    lastIndex: number;
    lastTimestamp: number;
};

export type MetricsWindowBoundary = {
    index: number;
    timestamp: number;
};

export type InferenceMetrics = MgmtInterfaceInferenceSummary['inferenceSummary'];

class StorageManager {
    private _storagePath: string = '';
    private _metricsDir: string = '';
    private _config: Config;
    private _model: ModelInformation;
    private _storageIndex: number = 0;
    private _firstIndex: number = Number.MAX_SAFE_INTEGER;
    // this limits the number of records in a single directory
    private _storageIndexSegment: number = 1000;
    private _storageSizeMaxBytes: number = 250 * 1024 * 1024;
    private _storageSize: number = 0;
    // when the monitor stores the record, storage manager checks if the storage size
    // is above the limit, if it is, it will remove the oldest segment
    // beacues of that feature, it is important to configure segement size and storage limit
    // on a propers level (depending on ther record size and the number of records per second)
    // so there will be more than one segment in the storage

    static async getStorageManager(conf: Config, model: ModelInformation) {
        let storageManager = new StorageManager(conf, model);
        await storageManager.initialize();
        return storageManager;
    }

    private constructor(conf: Config, model: ModelInformation) {
        this._config = conf;
        this._model = model;
    }

    private async getHighestAndLowestIndexes(path: string): Promise<{ highest: number, lowest: number }> {
        let highest = 0;
        let lowest = Number.MAX_SAFE_INTEGER;

        // get a list of all json files in the storage directory
        let files = await fs.readdir(path);

        // filter out non-json files
        files = files.filter(file => file.endsWith('.json'));

        // filter out files that don't have a number as the name
        files = files.filter(file => !isNaN(Number(Path.basename(file, '.json'))));

        // find the highest and lowest indexes
        for (const file of files) {
            const index = Number(Path.basename(file, '.json'));
            if (index > highest) {
                highest = index;
            }
            if (index < lowest) {
                lowest = index;
            }
        }
        if (lowest === Number.MAX_SAFE_INTEGER) {
            lowest = 0;
        }

        return { highest, lowest };
    }

    private async getPathByIndex(index: number): Promise<string> {
        const segment = Math.floor(index / this._storageIndexSegment);
        const path = Path.join(this._storagePath, segment.toString());

        if (await checkFileExists(path) === false) {
            await fs.mkdir(path, { recursive: true });
        }
        return path;
    }

    private async getStorageSize(path: string = this._storagePath): Promise<number> {

        const dirSize = async (dir: string) => {
            const files = await fs.readdir(dir, { withFileTypes: true });
            // create a list of promises that will return the size of each file
            const sizesPromiseArr: Promise<number>[] = files.map( async file => {
                const filePath = Path.join( dir, file.name );
                // if the file is a directory, then call the dirSize function recursively
                if (file.isDirectory()) return await dirSize(filePath);
                if (file.isFile()) return (await fs.stat(filePath)).size;
                // for any other types return 0 bytes size
                return 0;
            });
            // wait for all promises to resolve
            const sizesArr = (await asyncPool(10, sizesPromiseArr, async (fileSize) => {
                return await fileSize;
            })).flat();

            return sizesArr.reduce((acc, size) => acc + size, 0);
        };

        return await dirSize(path);
    }

    private async initialize(): Promise<void> {
        const modelProjectId = this._model.project.id;
        const deploymentVersion = await this._config.getDeploymentVersion();

        // We store inference records in a directory structure based on the model project ID
        // and deployment version.
        // TODO[MM] Verify that the deployment version is actually always set, since the
        // type system suggests otherwise.
        const currentStoragePath = await this._config.getStoragePath();
        const expectedStoragePath = Path.join(
            this._config.getDefaultStoragePath(),
            modelProjectId.toString(),
            deploymentVersion?.toString() ?? '',
        );

        if (currentStoragePath !== expectedStoragePath) {
            this._storagePath = expectedStoragePath;

            await this._config.storeStoragePath(this._storagePath);
        }
        else {
            this._storagePath = currentStoragePath;
        }

        // If a storage max size is set in config, use it (in MB, converted to bytes). Otherwise, use the default.
        // TODO[MM] Consider if a minimum/maximum should be enforced, probably yes.
        const storageMaxSizeMb = await this._config.getStorageMaxSizeMb();
        if (storageMaxSizeMb !== undefined) {
            this._storageSizeMaxBytes = storageMaxSizeMb * 1024 * 1024; // convert to bytes
        }

        // set the metrics directory path
        this._metricsDir = Path.join(this._storagePath, 'metrics');
        if (await checkFileExists(this._metricsDir) === false) {
            await fs.mkdir(this._metricsDir, { recursive: true });
        }

        // get the current storage index (the next index to be used for saving records)
        // storage index may be updated during the initialization if there is a record with higer index
        // we can't overwrite existing records, so we need to start from the next index
        this._storageIndex = await this._config.getStorageIndex();

        // check if storage directory exists
        if (await checkFileExists(this._storagePath) === false) {
            await fs.mkdir(this._storagePath, { recursive: true });
        }
        else {
            // if storage exist, then try to restore first and last index
            // get list of all directories (segments) in the storage directory
            let dirs = await fs.readdir(this._storagePath, { withFileTypes: true });
            // filter out non-directories
            dirs = dirs.filter(dirent => dirent.isDirectory());
            // filter out directories that don't have a number as the name
            dirs = dirs.filter(dirent => !isNaN(Number(dirent.name)));
            let lowest = 0;
            let highest = 0;
            if (dirs.length === 0) {
                // if there are no directories, then we need to find the highest and lowest indexes
                ({ highest, lowest } = await this.getHighestAndLowestIndexes(this._storagePath));
            }
            else {
                let highestSegment = 0;
                let lowestSegment = Number.MAX_SAFE_INTEGER;
                // find the highest and lowest segments
                for (const dirent of dirs) {
                    const index = Number(dirent.name);
                    if (index > highestSegment) {
                        highestSegment = index;
                    }
                    if (index < lowestSegment) {
                        lowestSegment = index;
                    }
                }
                ({ highest } = await this.getHighestAndLowestIndexes(
                                    Path.join(this._storagePath, highestSegment.toString())
                                ));
                ({ lowest } = await this.getHighestAndLowestIndexes(
                                    Path.join(this._storagePath, lowestSegment.toString())
                                ));
            }
            this._firstIndex = lowest;
            this._storageIndex = highest + 1;
        }

        this._storageSize = await this.getStorageSize();
    }

    // TODO[MM] Currently, only data segments are deleted when storage is full.
    // If metrics files grow too large, they may not be cleaned up.
    private async cleanupStorage(): Promise<void> {
        // get list of segment directories
        let dirs = await fs.readdir(this._storagePath, { withFileTypes: true });
        // filter out non-directories
        dirs = dirs.filter(dirent => dirent.isDirectory());
        // filter out directories that don't have a number as the name
        dirs = dirs.filter(dirent => !isNaN(Number(dirent.name)));
        if (dirs.length < 2) {
            return;
        }
        // sort the directories in ascending order
        dirs.sort((a, b) => a.name.localeCompare(b.name));
        // get the lowest segment number
        let lowestSegmentPath = Path.join(this._storagePath, dirs[0].name);

        // get the size of the lowest segment
        let lowestSegmentSize = await this.getStorageSize(lowestSegmentPath);

        // get number of records in the lowest segment
        let { highest, lowest } = await this.getHighestAndLowestIndexes(lowestSegmentPath);

        const stats = await fs.stat(lowestSegmentPath);
        if (stats.isDirectory()) {
            // In Node.js v16, fs.rmdir with recursive option is deprecated
            // fs.rm is the recommended replacement
            await fs.rm(lowestSegmentPath, { recursive: true, force: true });
        }
        else {
            await fs.unlink(lowestSegmentPath);
        }

        // update the first index
        this._firstIndex = highest + 1;
        // update the storage size
        this._storageSize -= lowestSegmentSize;
    }

    async getStorageStatus(): Promise<StorageStatus> {
        let temp = await this.getRecord(this._firstIndex);
        const firstTimestamp = temp ? temp.timestamp : 0;
        temp = await this.getRecord(this._storageIndex - 1);
        const lastTimestamp = temp ? temp.timestamp : 0;

        return {
            firstIndex: this._firstIndex,
            firstTimestamp: firstTimestamp,
            lastIndex: this._storageIndex - 1,
            lastTimestamp: lastTimestamp
        };
    }

    async saveInferenceMetrics(metricsStr: string, fileName: string): Promise<void> {
        const metricsPath = Path.join(this._metricsDir, `${fileName}.json`);
        await fs.writeFile(metricsPath, metricsStr);
    }

    async getLatestInferenceMetrics(): Promise<string | undefined> {
        try {
            const files = await fs.readdir(this._metricsDir);
            const metricsFiles = files.filter(file => file.endsWith('.json'));
            if (metricsFiles.length === 0) {
                return undefined;
            }

            // Sort files by the last index in the filename (after the last underscore)
            metricsFiles.sort((a, b) => {
                const indexA = Number(a.replace('.json', '').split('_').pop());
                const indexB = Number(b.replace('.json', '').split('_').pop());
                return indexB - indexA; // Sort in descending order
            });

            const latestFile = metricsFiles[0];
            return await fs.readFile(Path.join(this._metricsDir, latestFile), 'utf-8');
        }
        catch (error) {
            console.error(MONITOR_PREFIX, 'Error reading metrics files:', error);
            return undefined;
        }
    }

    // we pass raw data separately, so the storage manager can decide how to store it
    // JPEGs are stored in the files on disk, while WAVs are stored in the JSONs (so far)
    async saveRecord(record: ImpulseRecord): Promise<void> {
        let recordSize: number = 0;
        let rawDataSize: number = 0;

        record.index = this._storageIndex++;
        await this._config.storeStorageIndex(this._storageIndex);

        const recordPath = Path.join(await this.getPathByIndex(record.index), record.index.toString() + '.json');

        if (record.rawData.type === 'jpg') {
            const imgPath = Path.join(await this.getPathByIndex(record.index), record.index.toString() + '.jpg');
            const buf = Buffer.from(record.rawData.bufferBase64, 'base64');
            await fs.writeFile(imgPath, buf);
            rawDataSize = buf.length;
            record.rawData.bufferBase64 = imgPath;
        }

        const recordStr = JSON.stringify(record, null, 4);
        await fs.writeFile(recordPath, recordStr, 'utf-8');
        recordSize = recordStr.length;

        this._storageSize += (recordSize + rawDataSize);

        if (this._storageSize > this._storageSizeMaxBytes) {
            console.log(MONITOR_PREFIX, 'Storage size exceeded the limit, cleaning up the storage');
            await this.cleanupStorage();
        }
    }

    async getRecord(index: number): Promise<ImpulseRecord | undefined> {
        const recordPath = Path.join(await this.getPathByIndex(index), index.toString() + '.json');

        if (await checkFileExists(recordPath) === false) {
            return undefined;
        }

        let record = <ImpulseRecord>JSON.parse(await fs.readFile(recordPath, 'utf-8'));
        if (record.rawData.type === 'jpg') {
            let fileBuf: Buffer;
            if (await checkFileExists(record.rawData.bufferBase64) === false) {
                // looks like this record has the raw data embedded
                // try to decode the base64 and return it as a buffer
                try {
                    fileBuf = Buffer.from(record.rawData.bufferBase64, 'base64');
                }
                catch (ex) {
                    throw new Error(`Record ${index} doesn't have the raw data file and the base64 is invalid`);
                }
            }
            fileBuf = await fs.readFile(record.rawData.bufferBase64);
            record.rawData.bufferBase64 = fileBuf.toString('base64');
        }

        return record;
    }
}

interface MetricCalculator {
    name: string;
    update(classification: { [label: string]: number } | undefined): void;
    getMetric(): { label: string; value: number }[];
}

type MeanValues = {
    [label: string]: {
        count: number;
        sum: number;
    };
};

class MeanCalculator implements MetricCalculator {
    private _mean: MeanValues;
    private _name: string = 'mean';
    private _confidenceThreshold: number;

    constructor(opts: {
        confidenceThreshold: number,
    }) {
        this._mean = { };
        this._confidenceThreshold = opts.confidenceThreshold;
    }

    get name(): string {
        return this._name;
    }

    update(classification: { [label: string]: number } | undefined): void {
        if (classification === undefined) {
            return;
        }

        // Here we only want to update the mean for the label that was actually
        // predicted (hence, the one >= the threshold, with the highest score).
        // Imagine a model with two classes, A and B, and within some window the model
        // classifies once as A, once as B, with the scores: [ (0.8, 0.2), (0.2, 0.8) ].
        // When looking at the mean for A we should get an answer of 0.8, not 0.5, this is
        // because the question we're answering is "when the model predicts A, how confident
        // is it in its decision?"
        let predictedLabel: string | undefined;
        let predictedScore: number = 0;

        for (const label of Object.keys(classification)) {
            const score = Number(classification[label]);
            if (score > predictedScore && score >= this._confidenceThreshold) {
                predictedScore = score;
                predictedLabel = label;
            }
        }

        if (predictedLabel !== undefined) {
            try {
                this._mean[predictedLabel].count += 1;
                this._mean[predictedLabel].sum += Number(classification[predictedLabel]);
            }
            catch (ex) {
                this._mean[predictedLabel] = { count: 1, sum: Number(classification[predictedLabel]) };
            }
        }
    }

    getMeanByLabel(label: string): number {
        if (this._mean[label] === undefined) {
            return 0;
        }
        return this._mean[label].sum / this._mean[label].count;
    }

    getMetric(): { label: string; value: number }[] {
        let ret: { label: string; value: number }[] = [];

        for (const label in this._mean) {
            if (!this._mean.hasOwnProperty(label)) {
                continue;
            }
            ret.push({ label: label, value: this._mean[label].sum / this._mean[label].count });
        }
        return ret;
    }
}

type StdDevValues = {
    [label: string]: {
        count: number;
        m2: number;
        mean: number;
    };
};

class StdDevCalculator implements MetricCalculator {
    private _stdDev: StdDevValues;
    private _name: string = 'standardDeviation';
    private _confidenceThreshold: number;

    constructor(opts: {
        confidenceThreshold: number,
    }) {
        this._stdDev = { };
        this._confidenceThreshold = opts.confidenceThreshold;
    }

    get name(): string {
        return this._name;
    }

    // based on Welford's online algorithm
    // https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm
    update(classification: { [label: string]: number } | undefined ): void {
        if (classification === undefined) {
            return;
        }

        // Here we only want to update the stdev for the label that was actually
        // predicted (hence, the one >= the threshold, with the highest score).
        // See comment above in MeanCalculator for more details.
        let predictedLabel: string | undefined;
        let predictedScore: number = 0;

        for (const label of Object.keys(classification)) {
            const score = Number(classification[label]);
            if (score > predictedScore && score >= this._confidenceThreshold) {
                predictedScore = score;
                predictedLabel = label;
            }
        }

        if (predictedLabel !== undefined) {
            try {
                const x = Number(classification[predictedLabel]);
                this._stdDev[predictedLabel].count += 1;

                const delta = x - this._stdDev[predictedLabel].mean;
                this._stdDev[predictedLabel].mean += delta / this._stdDev[predictedLabel].count;

                const delta2 = x - this._stdDev[predictedLabel].mean;
                this._stdDev[predictedLabel].m2 += delta * delta2;
            }
            catch (ex) {
                this._stdDev[predictedLabel] = { count: 1, m2: 0, mean: Number(classification[predictedLabel]) };
            }
        }
    }

    getStdDevByLabel(label: string): number {
        if (this._stdDev[label] === undefined) {
            return 0;
        }

        return Math.sqrt(this._stdDev[label].m2 / (this._stdDev[label].count));
    }

    getMetric(): { label: string; value: number }[] {
        const ret: { label: string; value: number }[] = [];

        for (const label of Object.keys(this._stdDev)) {
            const val = Math.sqrt(this._stdDev[label].m2 / (this._stdDev[label].count));
            ret.push({ label: label, value: val });
        }

        return ret;
    }
}

type InferenceMetricsCache = {
    metrics: InferenceMetrics;
};

class MetricsCalculator {
    private _storageManager: StorageManager;
    private _meanCalculator: MeanCalculator;
    private _stdDevCalculator: StdDevCalculator;
    private _metrics: InferenceMetrics;
    private _model: ModelInformation;
    private _confidenceThreshold: number;
    private _summaryWindowMs: number;

    // parameters and variables used to determine summary period
    private _windowStartIndex: number = 0;
    private _windowStartTimestamp: number = 0;

    private _totalInferenceTime = {
        dsp: 0,
        classification: 0,
        anomaly: 0,
    };

    private _visualAnomalyMean: number = 0;

    // because we need to initialize the class with async method, the constructor is private
    // and any new object should be created using getMetricsInstance
    static async getMetricsInstance(
        config: Config,
        storage: StorageManager,
        model: ModelInformation
    ): Promise<MetricsCalculator> {
        // Get the interval from config, default to DEFAULT_MONITOR_SUMMARY_INTERVAL_MS
        let summaryWindowMs = await config.getMonitorSummaryIntervalMs();
        if (!summaryWindowMs || isNaN(summaryWindowMs) || summaryWindowMs <= 0) {
            summaryWindowMs = DEFAULT_MONITOR_SUMMARY_INTERVAL_MS;
        }
        const metrics = new MetricsCalculator(storage, model, summaryWindowMs);

        // Initialize the metrics by restoring them from the storage
        await metrics.restoreMetrics();

        return metrics;
    }

    // private constructor to prevent direct object creation, use getMetricsInstance instead
    private constructor(storage: StorageManager, model: ModelInformation, summaryWindowMs: number) {
        this._storageManager = storage;
        this._model = model;
        this._summaryWindowMs = summaryWindowMs;

        let threshold: number | undefined;
        if (model.modelParameters.has_anomaly === RunnerHelloHasAnomaly.VisualGMM) {
            const thresholdObj = (model.modelParameters.thresholds || []).find(x => x.type === 'anomaly_gmm');
            if (thresholdObj && thresholdObj.type === 'anomaly_gmm') {
                threshold = thresholdObj.min_anomaly_score;
            }
        }
        else if (model.modelParameters.model_type === 'constrained_object_detection' ||
                 model.modelParameters.model_type === 'object_detection'
        ) {
            const thresholdObj = (model.modelParameters.thresholds || []).find(x => x.type === 'object_detection');
            if (thresholdObj && thresholdObj.type === 'object_detection') {
                threshold = thresholdObj.min_score;
            }
        }

        if (typeof threshold === 'undefined') {
            console.warn(MONITOR_PREFIX, 'Model threshold is not defined, using default value of 0.5');
            this._confidenceThreshold = 0.5;
        }
        else {
            this._confidenceThreshold = threshold;
        }
        this._meanCalculator = new MeanCalculator({ confidenceThreshold: this._confidenceThreshold });
        this._stdDevCalculator = new StdDevCalculator({ confidenceThreshold: this._confidenceThreshold });

        // init as empty, will be overwritten by restoreMetrics
        this._metrics = {
            start: { index: 0, timestamp: 0 },
            end: { index: 0, timestamp: 0 },
            classificationCounter: [],
            mean: [],
            standardDeviation: [],
            metrics: {},
        };
    }

    private resetMetrics(): void {
        this._meanCalculator = new MeanCalculator({ confidenceThreshold: this._confidenceThreshold });
        this._stdDevCalculator = new StdDevCalculator({ confidenceThreshold: this._confidenceThreshold });

        this._metrics = {
            start: { index: this._windowStartIndex, timestamp: this._windowStartTimestamp },
            end: { index: this._windowStartIndex, timestamp: this._windowStartTimestamp },
            classificationCounter: [],
            mean: [],
            standardDeviation: [],
            metrics: {},
        };

        this._totalInferenceTime = {
            dsp: 0,
            classification: 0,
            anomaly: 0,
        };

        this._visualAnomalyMean = 0;
    }

    async updateMetrics(record: ImpulseRecord): Promise<boolean> {
        // If this is the first record in a new window, reset metrics
        if (this._windowStartTimestamp === 0) {
            // This is the start of a new metrics window,
            // set window start index/timestamp
            this._windowStartIndex = record.index;
            this._windowStartTimestamp = record.timestamp;

            this.resetMetrics();
        }

        const incrementClassificationCounter = (key: string) => {
            // find key index in classificationCounter
            const index = this._metrics.classificationCounter.findIndex((element) => element.label === key);
            if (index < 0) {
                this._metrics.classificationCounter.push({ label: key, value: 1 });
            }
            else {
                this._metrics.classificationCounter[index].value++;
            }
        };

        if (
            this._model.modelParameters.has_anomaly === RunnerHelloHasAnomaly.VisualGMM &&
            record.impulseRecord.result.visual_anomaly_max !== undefined
        ) {
            const isAnomaly = record.impulseRecord.result.visual_anomaly_max > this._confidenceThreshold;
            const predictedLabel = isAnomaly ? 'anomaly' : 'no anomaly';
            incrementClassificationCounter(predictedLabel);

            const classifications = { [predictedLabel]: record.impulseRecord.result.visual_anomaly_max };
            // update mean and stdev partial values
            this._meanCalculator.update(classifications);
            this._stdDevCalculator.update(classifications);
        }
        // check if property classification exists in record.impulseRecord.result
        else if (record.impulseRecord.result.classification !== undefined) {
            // iterate over properites in impulseRecord.result.classification
            for (const key in record.impulseRecord.result.classification) {
                if (!record.impulseRecord.result.classification.hasOwnProperty(key)) {
                    continue;
                }

                // check if value is above threshold
                if (Number(record.impulseRecord.result.classification[key]) > this._confidenceThreshold) {
                    incrementClassificationCounter(key);
                }
            }

            // update mean and stdev partial values
            this._meanCalculator.update(record.impulseRecord.result.classification);
            this._stdDevCalculator.update(record.impulseRecord.result.classification);
        }
        else if (record.impulseRecord.result.bounding_boxes !== undefined) {
            // iterate over list of bounding boxes
            for (const box of record.impulseRecord.result.bounding_boxes) {
                // check if value is above threshold
                if (box.value > this._confidenceThreshold) {
                    incrementClassificationCounter(box.label);
                }
            }

            // Convert bounding boxes to a classification data object, i.e go from
            // [{ label: 'cat', value: 0.9, x: 40, y: 50, ... }, { label: 'dog', value: 0.8, x: 10, y: 20, ... }] to
            // { cat: 0.9, dog: 0.8 }, so we can use it for mean and stdev calculations
            const classificationData = record.impulseRecord.result.bounding_boxes.reduce((acc, { label, value }) => {
                acc[label] = value;
                return acc;
            }, {} as { [k: string]: number });

            // update mean and stdev partial values
            this._meanCalculator.update(classificationData);
            this._stdDevCalculator.update(classificationData);
        }

        // Calculate average inference time, if timing information is present
        if (record.impulseRecord.timing) {
            this._totalInferenceTime.dsp += record.impulseRecord.timing.dsp;
            this._totalInferenceTime.classification += record.impulseRecord.timing.classification;
            this._totalInferenceTime.anomaly += record.impulseRecord.timing.anomaly;
        }

        // Only calculate mean visual anomaly score if relevant
        if (
            this._model.modelParameters.has_anomaly === RunnerHelloHasAnomaly.VisualGMM &&
            record.impulseRecord.result.visual_anomaly_mean
        ) {
            this._visualAnomalyMean += record.impulseRecord.result.visual_anomaly_mean;
        }

        // update the end boundary
        this._metrics.end = { index: record.index, timestamp: record.timestamp };

        // Check if the time window has elapsed
        if ((record.timestamp - this._windowStartTimestamp) >= this._summaryWindowMs) {
            // Save metrics and reset window
            await this.saveMetrics();
            this._windowStartTimestamp = 0;

            return true;
        }

        return false;
    }

    getMetrics(): InferenceMetrics {
        // get actual mean values
        this._metrics.mean = this._meanCalculator.getMetric();
        this._metrics.standardDeviation = this._stdDevCalculator.getMetric();

        // calculate other metrics
        const numberOfInferences = this._metrics.end.index - this._metrics.start.index + 1;

        // Average inference time, only include `anomaly` if the model has anomaly detection
        if (this._model.modelParameters.has_anomaly) {
            this._metrics.metrics.avg_inference_time = {
                dsp: this._totalInferenceTime.dsp / numberOfInferences,
                classification: this._totalInferenceTime.classification / numberOfInferences,
                anomaly: this._totalInferenceTime.anomaly / numberOfInferences,
            };
        }
        else {
            this._metrics.metrics.avg_inference_time = {
                dsp: this._totalInferenceTime.dsp / numberOfInferences,
                classification: this._totalInferenceTime.classification / numberOfInferences,
            };
        }

        // Only include visual_anomaly_mean if visual anomaly is relevant
        if (this._model.modelParameters.has_anomaly === RunnerHelloHasAnomaly.VisualGMM) {
            this._metrics.metrics.visual_anomaly_mean = this._visualAnomalyMean / numberOfInferences;
        }
        else {
            delete this._metrics.metrics.visual_anomaly_mean;
        }

        return this._metrics;
    }

    async saveMetrics(): Promise<void> {
        const cache: InferenceMetricsCache = {
            metrics: this.getMetrics()
        };

        await this._storageManager.saveInferenceMetrics(
            JSON.stringify(cache, null, 2),
            `${this._metrics.start.index}_${this._metrics.end.index}`
        );
    }

    // restore saved metrics from the storage
    private async restoreMetrics(): Promise<void> {
        // load serialized metrics from the storage
        const cache = await this._storageManager.getLatestInferenceMetrics();
        if (cache) {
            // if cache exists, then try to deserialize it
            const data = <InferenceMetricsCache>JSON.parse(cache);
            this._metrics = data.metrics;
        }
    }
}

/**
 * Represents a model monitor that emits events related to impulse records and inference summaries.
 */
export class ModelMonitor extends EventEmitter<{
    'impulse-record': (ev: ImpulseRecord) => void,
    'impulse-records-response': (ev: ImpulseRecord | ImpulseRecordError) => void,
    'inference-summary': (ev: InferenceMetrics) => void,
}> {
    private _storageManager: StorageManager | undefined;
    private _metricsCalculator: MetricsCalculator | undefined;
    private _streamState: 'idle' | 'debug' | 'records-request' = 'idle';
    private _streamPrevState: 'idle' | 'debug' | 'records-request' = 'idle';

    private constructor(_config: Config) {
        super();
    }

    /**
     * Creates a new instance of ModelMonitor with the provided configuration and model information.
     * @param config The configuration object.
     * @param model The model information object.
     * @returns A promise that resolves to a ModelMonitor instance.
     */
    static async getModelMonitor(config: Config, model: ModelInformation): Promise<ModelMonitor> {
        const monitor = new ModelMonitor(config);

        monitor._storageManager = await StorageManager.getStorageManager(config, model);
        monitor._metricsCalculator = await MetricsCalculator.getMetricsInstance(config, monitor._storageManager, model);

        return monitor;
    }

    async flushMetrics(): Promise<void> {
        if (this._metricsCalculator) {
            await this._metricsCalculator.saveMetrics();

            this.emit('inference-summary', this._metricsCalculator.getMetrics());
        }
    }

    get impulseDebug() {
        return this._streamState === 'debug';
    }

    /**
     * Enable the Model Debugging mode.
     * When enabled, the model monitor will emit impulse records as they are processed.
     * When disabled, the model monitor will not emit impulse records.
     * In the 'records-request' state, setting impulseDebug to true will abort the records-request state.
     * In the 'records-request' state, setting impulseDebug to false has no effect.
     */
    set impulseDebug(enabled: boolean) {
        if (this._streamState === 'records-request' && enabled === true) {
            // TODO: send abort/error message
            console.log(MONITOR_PREFIX, 'Stream was in records-request state, but impulseDebug was set to ' + enabled);
            console.log(MONITOR_PREFIX, 'Aborting the records-request state');
        }
        if (enabled) {
            this._streamState = 'debug';
            this._streamPrevState = 'idle';
        }
        else {
            this._streamState = 'idle';
            this._streamPrevState = 'idle';
        }
    }

    async getStorageStatus(): Promise<StorageStatus> {
        if (this._storageManager) {
            return await this._storageManager.getStorageStatus();
        }
        return {
            firstIndex: 0,
            firstTimestamp: 0,
            lastIndex: 0,
            lastTimestamp: 0
        };
    }

    abortImpulseRecordsRequest() {
        this._streamState = this._streamPrevState;
        this._streamPrevState = 'idle';
    }

    /**
     * Retrieves impulse records based on the provided request.
     * @param impulseRequest The request object specifying the index, range, or list of indices to retrieve.
     * One of the following properties must be provided:
     * - index: The index of the single impulse record to retrieve.
     * - range: An object with first and last properties specifying the range of impulse records to retrieve.
     * - list: An array of indices of impulse records to retrieve (in any order)
     * @throws Error if the request is invalid or the first index is greater than the last index.
     */
    getImpulseRecords(impulseRequest: {
                        index?: number,
                        range?: { first: number, last: number },
                        list?: number[]
    }): void {
        if (this._streamState === 'debug') {
            console.log(MONITOR_PREFIX, 'Stream is in debug mode, pausing the debug stream');
        }
        this._streamPrevState = this._streamState;
        this._streamState = 'records-request';

        if (typeof impulseRequest.index === 'number') {
            void this._storageManager?.getRecord(impulseRequest.index)
                .then(record => {
                    if (record) {
                        this.emit('impulse-records-response', record);
                    }
                    else {
                        // TODO: is this sanity check needed?
                        if (impulseRequest.index === undefined) {
                            throw new Error('Index is undefined');
                        }
                        this.emit('impulse-records-response', {
                            index: impulseRequest.index,
                            error: 'Record not found'
                        });
                    }
                });
        }
        else if (impulseRequest.range) {
            if (impulseRequest.range.first > impulseRequest.range.last) {
                this.emit('impulse-records-response', { index: impulseRequest.range.first, error: 'First index higher than the last one' });
                this.abortImpulseRecordsRequest();
                return;
            }
            for (let i = impulseRequest.range.first; i <= impulseRequest.range.last; i++) {
                void this._storageManager?.getRecord(i)
                    .then(record => {
                        if (record) {
                            this.emit('impulse-records-response', record);
                        }
                        else {
                            this.emit('impulse-records-response', { index: i, error: 'Record not found' });
                        }
                    });
                if (this._streamState !== 'records-request') {
                    console.log(MONITOR_PREFIX, 'Stream state changed, aborting the records-request');
                    break;
                }
            }
        }
        else if (impulseRequest.list) {
            // sort the list of indices in ascending order
            impulseRequest.list.sort((a, b) => a - b);
            for (const index of impulseRequest.list) {
                void this._storageManager?.getRecord(index)
                    .then(record => {
                        if (record) {
                            this.emit('impulse-records-response', record);
                        }
                        else {
                            this.emit('impulse-records-response', { index: index, error: 'Record not found' });
                        }
                    });
                if (this._streamState !== 'records-request') {
                    console.log(MONITOR_PREFIX, 'Stream state changed, aborting the records-request');
                    break;
                }
            }
        }
        else {
            throw new Error('Invalid impulse request');
        }

        // restore the previous state
        this._streamState = this._streamPrevState;
    }

    async processResult(result: RunnerClassifyResponseSuccess, rawData: {
        type: 'wav' | 'jpg',
        buffer: Buffer,
    }): Promise<void> {
        let record: ImpulseRecord = {
            impulseRecord: result,
            timestamp: Date.now(),
            index: -1, // will be set by the storage manager later
            rawData: {
                type: rawData.type,
                bufferBase64: rawData.buffer.toString('base64'),
            },
        };

        void this._storageManager?.saveRecord(record);

        if (this._metricsCalculator && await this._metricsCalculator.updateMetrics(record)) {
            this.emit('inference-summary', this._metricsCalculator.getMetrics());
        }

        if (this.impulseDebug) {
            this.emit('impulse-record', record);
        }
    }
}
