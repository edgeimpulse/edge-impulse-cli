import fs from 'fs';
import Path from 'path';
import util from 'util';
import { Config } from './config';
import { RunnerClassifyResponseSuccess } from "../library/classifier/linux-impulse-runner";
import { ModelInformation } from '../library/classifier/linux-impulse-runner';
import { EventEmitter } from 'tsee';
import { MgmtInterfaceImpulseRecordRawData } from '../shared/MgmtInterfaceTypes';

const MONITOR_PREFIX = '\x1b[34m[MON]\x1b[0m';

function checkFileExists(file: string) {
    return new Promise(resolve => {
        return fs.promises.access(file, fs.constants.F_OK)
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

export type InferenceMetrics = {
    firstIndex: number;
    lastIndex: number;
    classificationCounter: {
        label: string;
        value: number
    }[];
    mean: {
        label: string;
        value: number
    }[];
    standardDeviation: {
        label: string;
        value: number
    }[];
    metrics: {
        name: string;
        value: number
    }[];
};

class StorageManager {
    private _storagePath: string = '';
    private _metricsPath: string = '';
    private _config: Config;
    private _model: ModelInformation;
    private _storageIndex: number = 0;
    private _firstIndex: number = Number.MAX_SAFE_INTEGER;
    // this limits the number of records in a single directory
    private _storageIndexSegment: number = 1000;
    // hardcoded to 250 MB for now
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
        let files = await fs.promises.readdir(path);

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
            await fs.promises.mkdir(path, { recursive: true });
        }
        return path;
    }

    private async getStorageSize(path: string = this._storagePath): Promise<number> {

        const dirSize = async (dir: string) => {
            const files = await fs.promises.readdir(dir, { withFileTypes: true });
            // create a list of promises that will return the size of each file
            const sizesPromiseArr: Promise<number>[] = files.map( async file => {
                const filePath = Path.join( dir, file.name );
                // if the file is a directory, then call the dirSize function recursively
                if (file.isDirectory()) return await dirSize(filePath);
                if (file.isFile()) return (await fs.promises.stat(filePath)).size;
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
        this._storagePath = await this._config.getStoragePath();

        let modelProjectId = this._model.project.id;

        // check if the last directory in the path is equal to modelProjectId
        if (Path.basename(this._storagePath) !== modelProjectId.toString()) {
            // if not, append modelProjectId to the default storage path
            this._storagePath = Path.join(this._config.getDefaultStoragePath(), modelProjectId.toString());
            // update the storage path in the config
            await this._config.storeStoragePath(this._storagePath);
        }

        // set the metrics path
        this._metricsPath = Path.join(this._storagePath, 'metrics.json');

        // get the current storage index (the next index to be used for saving records)
        // storage index may be updated during the initialization if there is a record with higer index
        // we can't overwrite existing records, so we need to start from the next index
        this._storageIndex = await this._config.getStorageIndex();

        // check if storage directory exists
        if (await checkFileExists(this._storagePath) === false) {
            await fs.promises.mkdir(this._storagePath, { recursive: true });
        }
        else {
            // if storage exist, then try to restore first and last index
            // get list of all directories (segments) in the storage directory
            let dirs = await fs.promises.readdir(this._storagePath, { withFileTypes: true });
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

    private async cleanupStorage(): Promise<void> {
        // get list of segment directories
        let dirs = await fs.promises.readdir(this._storagePath, { withFileTypes: true });
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

        // remove the lowest segment
        await fs.promises.rm(lowestSegmentPath, { recursive: true });
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

    async saveInferenceMetrics(metrics: string): Promise<void> {
        await fs.promises.writeFile(this._metricsPath, metrics);
    }

    async getInferenceMetrics(): Promise<string | undefined> {
        if (await checkFileExists(this._metricsPath) === true) {
            return await fs.promises.readFile(this._metricsPath, 'utf-8');
        }
        return undefined;
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
            await fs.promises.writeFile(imgPath, buf);
            rawDataSize = buf.length;
            record.rawData.bufferBase64 = imgPath;
        }

        const recordStr = JSON.stringify(record, null, 4);
        await fs.promises.writeFile(recordPath, recordStr, 'utf-8');
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

        let record = <ImpulseRecord>JSON.parse(await fs.promises.readFile(recordPath, 'utf-8'));
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
            fileBuf = <Buffer>await fs.promises.readFile(record.rawData.bufferBase64);
            record.rawData.bufferBase64 = fileBuf.toString('base64');
        }

        return record;
    }
}

interface MetricCalculator {
    name: string;
    serialize(): string;
    deserialize(data: string): void;
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

    constructor() {
        this._mean = { };
    }

    get name(): string {
        return this._name;
    }

    serialize(): string {
        return JSON.stringify(this._mean);
    }

    deserialize(data: string): void {
        try {
            this._mean = <MeanValues>JSON.parse(data);
        }
        catch (ex) {
            this._mean = { };
        }
    }

    update(classification: { [label: string]: number } | undefined): void {
        if (classification === undefined) {
            return;
        }

        for (const label in classification) {
            if (!classification.hasOwnProperty(label)) {
                continue;
            }
            try {
                this._mean[label].count += 1;
                this._mean[label].sum += Number(classification[label]);
            }
            catch (ex) {
                this._mean[label] = { count: 1, sum: Number(classification[label]) };
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

    constructor() {
        this._stdDev = { };
    }

    get name(): string {
        return this._name;
    }

    serialize(): string {
        return JSON.stringify(this._stdDev);
    }

    deserialize(data: string): void {
        try {
            this._stdDev = <StdDevValues>JSON.parse(data);
        }
        catch (ex) {
            this._stdDev = { };
        }
    }

    // based on Welford's online algorithm
    // https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm
    update(classification: { [label: string]: number } | undefined ): void {
        if (classification === undefined) {
            return;
        }

        for (const label in classification) {
            if (!classification.hasOwnProperty(label)) {
                continue;
            }
            try {
                const x = classification[label];
                this._stdDev[label].count += 1;

                const delta = x - this._stdDev[label].mean;
                this._stdDev[label].mean += delta / this._stdDev[label].count;
                const delta2 = x - this._stdDev[label].mean;
                this._stdDev[label].m2 += delta * delta2;
            }
            catch (ex) {
                this._stdDev[label] = { count: 1, m2: 0, mean: 0 };
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
        let ret: { label: string; value: number }[] = [];

        for (const label in this._stdDev) {
            if (!this._stdDev.hasOwnProperty(label)) {
                continue;
            }
            let val = Math.sqrt(this._stdDev[label].m2 / (this._stdDev[label].count));
            ret.push({ label: label, value: val });
        }
        return ret;
    }
}

type InferenceMetricsCache = {
    metrics: InferenceMetrics;
    meanCalculator: string;
    stdDevCalculator: string;
};

class MetricsCalculator {
    private _storageManager: StorageManager;
    private _meanCalculator: MeanCalculator;
    private _stdDevCalculator: StdDevCalculator;
    private _metrics: InferenceMetrics;
    private _model: ModelInformation;
    private _confidenceThreshold: number;
    // parameters and variables used to determine summary period
    private _inferenceSummaryPeriod: number = 10;
    private _inferenceSummaryCounter: number = 0;

    // because we need to initialize the class with async method, the constructor is private
    // and any new object should be created using getMetricsInstance
    static async getMetricsInstance(storage: StorageManager, model: ModelInformation): Promise<MetricsCalculator> {
        let metrics = new MetricsCalculator(storage, model);
        await metrics.restoreMetrics(model);

        return metrics;
    }

    // private constructor to prevent direct object creation, use getMetricsInstance instead
    private constructor(storage: StorageManager, model: ModelInformation) {
        this._meanCalculator = new MeanCalculator();
        this._stdDevCalculator = new StdDevCalculator();
        this._storageManager = storage;
        this._model = model;

        if (model.modelParameters.threshold === undefined) {
            console.warn(MONITOR_PREFIX, 'Model threshold is not defined, using default value of 0.5');
            this._confidenceThreshold = 0.5;
        }
        else {
            this._confidenceThreshold = model.modelParameters.threshold ?? 0.5;
        }

        // init as empty, will be overwritten by restoreMetrics
        this._metrics = {
            firstIndex: 0,
            lastIndex: 0,
            classificationCounter: [],
            mean: [],
            standardDeviation: [],
            metrics: []
        };
    }

    // restore saved metrics from the storage
    private async restoreMetrics(model: ModelInformation): Promise<void> {
        // load serialized metrics from the storage
        const cache = await this._storageManager.getInferenceMetrics();
        if (cache) {
            // if cache exists, then try to deserialize it
            const data = <InferenceMetricsCache>JSON.parse(cache);
            this._meanCalculator.deserialize(data.meanCalculator);
            this._stdDevCalculator.deserialize(data.stdDevCalculator);
            this._metrics = data.metrics;
        }
    }

    async updateMetrics(record: ImpulseRecord): Promise<boolean> {
        // check if property classification exists in record.impulseRecord.result
        if (record.impulseRecord.result.classification !== undefined) {
            // iterate over properites in impulseRecord.result.classification
            for (const key in record.impulseRecord.result.classification) {
                if (!record.impulseRecord.result.classification.hasOwnProperty(key)) {
                    continue;
                }
                // check if value is above threshold
                if (Number(record.impulseRecord.result.classification[key]) > this._confidenceThreshold) {
                    // find key index in classificationCounter
                    let index = this._metrics.classificationCounter
                                .findIndex((element) => element.label === key);
                    if (index < 0) {
                        this._metrics.classificationCounter.push({ label: key, value: 1 });
                    }
                    else {
                        this._metrics.classificationCounter[index].value++;
                    }
                }
            }
        }
        else if (record.impulseRecord.result.bounding_boxes !== undefined) {
            // iterate over list of bounding boxes
            for (const box of record.impulseRecord.result.bounding_boxes) {
                // check if value is above threshold
                if (box.value > this._confidenceThreshold) {
                    // find key index in classificationCounter
                    let index = this._metrics.classificationCounter
                                .findIndex((element) => element.label === box.label);
                    if (index < 0) {
                        this._metrics.classificationCounter.push({ label: box.label, value: 1 });
                    }
                    else {
                        this._metrics.classificationCounter[index].value++;
                    }
                }
            }
        }

        // update mean partial values
        this._meanCalculator.update(record.impulseRecord.result.classification);
        this._stdDevCalculator.update(record.impulseRecord.result.classification);

        // update the last index
        this._metrics.lastIndex = record.index;

        // store metrics with storage manager
        await this.saveMetrics();

        // send inference summary if needed
        this._inferenceSummaryCounter++;
        if (this._inferenceSummaryCounter === this._inferenceSummaryPeriod) {
            this._inferenceSummaryCounter = 0;
            return true;
        }
        return false;
    }

    getMetrics(): InferenceMetrics {
        // get actual mean values
        this._metrics.mean = this._meanCalculator.getMetric();
        this._metrics.standardDeviation = this._stdDevCalculator.getMetric();
        return this._metrics;
    }

    async saveMetrics(): Promise<void> {
        const cache: InferenceMetricsCache = {
            metrics: this.getMetrics(),
            meanCalculator: this._meanCalculator.serialize(),
            stdDevCalculator: this._stdDevCalculator.serialize()
        };

        await this._storageManager.saveInferenceMetrics(JSON.stringify(cache, null, 2));
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
        let monitor = new ModelMonitor(config);

        monitor._storageManager = await StorageManager.getStorageManager(config, model);
        monitor._metricsCalculator = await MetricsCalculator.getMetricsInstance(monitor._storageManager, model);

        return monitor;
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

        if (impulseRequest.index) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this._storageManager?.getRecord(impulseRequest.index)
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
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this._storageManager?.getRecord(i)
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
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this._storageManager?.getRecord(index)
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
            index: -1,
            rawData: {
                type: rawData.type,
                bufferBase64: rawData.buffer.toString('base64'),
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this._storageManager?.saveRecord(record);
        if (this._metricsCalculator?.updateMetrics(record)) {
            this.emit('inference-summary', this._metricsCalculator.getMetrics());
        }

        if (this.impulseDebug) {
            this.emit('impulse-record', record);
        }
    }
}
