import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IoTDataPlaneClient, PublishCommand, GetRetainedMessageCommand } from "@aws-sdk/client-iot-data-plane";
import { S3Client, CreateBucketCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { MetricsCollector } from './aws-metrics-collector';
import { ThresholdFilter, ThresholdFilterOptions } from './aws-threshold-filter';

const fileExists = async (filePath: string) => {
    try {
        await fs.access(filePath, 0 /* fs.constants.F_OK */);
        return true;
    }
    catch {
        return false;
    }
};

export enum BinaryStatus {
    YES = 'yes',
    NO = 'no'
}

export enum AWSStatus {
    SUCCESS = 'OK',
    FAILED = 'FAILED'
}

export enum Criteria {
    GREATER_THAN = 'gt',
    GREATER_THAN_OR_EQUAL = 'ge',
    EQUAL = 'eq',
    LESS_THAN_OR_EQUAL = 'le',
    LESS_THAN = 'lt'
}

interface Command {
    cmd: keyof CommandMethods;
    value?: any;
}

type CommandResultPayload =
    | { status: string; ts: number; id: string }
    | { restart: AWSStatus }
    | { confidence_threshold: number }
    | { criteria: Criteria }
    | { threshold_filter_config: object }
    | { model_info: object }
    | { clear_cache: object }
    | { clear_cache_file: object }
    | { metrics_reset: AWSStatus };

export function sanitizeYesNo(value?: string): BinaryStatus {
    return value?.toLowerCase() === BinaryStatus.YES ? BinaryStatus.YES : BinaryStatus.NO;
}

const PREFIX = '\x1b[34m[AWS_IOTCORE_CONNECTOR]\x1b[0m';
const IOTCORE_MAX_PAYLOAD = 131072; // maximum size of IoTCore Message
const DEFAULT_METRICS_COLLECTION_TIME_MS = 60_000; // 60 seconds
const DEFAULT_POLLING_TIME_MS = 2500; // 2.5 seconds
const DEFAULT_THRESHOLD_VALUE = 0.70; // 70% confidence minimum
const DEFAULT_THRESHOLD_CRITERIA = Criteria.GREATER_THAN_OR_EQUAL;

export interface ModelParams {
    readonly [key: string]: any;
}

export interface ModelInfoJSON {
    model_name: string;
    model_version: string;
    model_params?: ModelParams;
}

export class ModelInfo {
    constructor(
        readonly name: string,
        readonly version: string,
        readonly params?: ModelParams
    ) {}

    toJSON(): ModelInfoJSON {
        return {
            model_name: this.name,
            model_version: this.version,
            model_params: this.params
        };
    }
}

// Payload typing
type ClassificationResult = { [k: string]: string | number };
type BoundingBox = {
    label: string;
    value: number;
    x: number;
    y: number;
    width: number;
    height: number;
};

type BasePayload = {
    time_ms: number;
    info?: string;
    id: string;
    ts: number;
    inference_count: number;
    total_inferences: number;
    s3_bucket?: string;
    s3_prefix?: string;
};

type DynamicPayload = {
    [key in AwsResultKey]?: AwsResult;
};

export type AwsResult = ClassificationResult | BoundingBox[];
export type AwsResultKey = 'c' | 'box' | 'grid';
export type Payload = BasePayload & DynamicPayload;
type CommandMethod = (value?: any) => Promise<void>;

type AWSIoTCoreConnectorOptions = {
    appName: string,
    silentArgv: boolean,
    cleanArgv: boolean,
    apiKeyArgv: string | undefined,
    greengrassArgv: boolean,
    devArgv: boolean,
    hmacKeyArgv: string | undefined,
    connectProjectMsg: string,
};

type CommandMethods = {
    restart: CommandMethod;
    enable_threshold_filter: CommandMethod;
    disable_threshold_filter: CommandMethod;
    set_threshold_filter_criteria: CommandMethod;
    get_threshold_filter_criteria: CommandMethod;
    get_threshold_filter_confidence: CommandMethod;
    set_threshold_filter_confidence: CommandMethod;
    get_threshold_filter_config: CommandMethod;
    get_model_info: CommandMethod;
    clear_cache: CommandMethod;
    clear_cache_file: CommandMethod;
    reset_metrics: CommandMethod;
};

// Primary AWS IoTCore Connector/Processor class
export class AWSIoTCoreConnector {
    private static readonly DEFAULT_METRICS_COLLECTION_TIME_MS = DEFAULT_METRICS_COLLECTION_TIME_MS;
    private static readonly DEFAULT_POLLING_TIME_MS = DEFAULT_POLLING_TIME_MS;
    private static readonly DEFAULT_THRESHOLD_VALUE = DEFAULT_THRESHOLD_VALUE;
    private static readonly DEFAULT_THRESHOLD_CRITERIA = DEFAULT_THRESHOLD_CRITERIA;
    private _notSilent: boolean;
    private _inferenceOutputTopic: string | undefined;
    private _metricsOutputTopic: string | undefined;
    private _commandInputTopic: string | undefined;
    private _commandOutputTopic: string | undefined;
    private _iot: IoTDataPlaneClient | undefined;
    private _s3Client: S3Client | undefined;
    private readonly _clientConfig;
    private _iotcoreQoS: number;
    private _delayCountdown: number;
    private _delayInferences: number;
    private _pollSleepTime: number;
    private readonly _opts: AWSIoTCoreConnectorOptions | undefined;
    private readonly _enableWriteToFile: string;
    private readonly _writeToFileDir: string;
    private _metricsCollector: MetricsCollector | undefined;
    private _thresholdFilter: ThresholdFilter | undefined;
    private _modelInfo: ModelInfo | undefined;
    private _metricsDispatchSleepTimeMS: number;
    private readonly _enableWriteToS3: string;
    private readonly _s3Bucket: string;

    private readonly commands: CommandMethods;

    constructor(opts: {
        appName: string,
        silentArgv: boolean,
        cleanArgv: boolean,
        apiKeyArgv: string | undefined,
        greengrassArgv: boolean,
        devArgv: boolean,
        hmacKeyArgv: string | undefined,
        connectProjectMsg: string,
        iotClient?: IoTDataPlaneClient,
        s3Client?: S3Client
    }) {
        this._notSilent = (!opts.silentArgv);
        this._clientConfig = { region: process.env.AWS_REGION };
        this._iot = opts.iotClient;
        this._s3Client = opts.s3Client;
        this._delayCountdown = 0;
        this._iotcoreQoS = this.sanitizeQoS(Number((<string>process.env.EI_IOTCORE_QOS)));
        this._opts = opts;

        this.commands = {
            restart: () => this.handleRestartCommand(),
            enable_threshold_filter: () => this.handleEnableThresholdFilterCommand(),
            disable_threshold_filter: () => this.handleDisableThresholdFilterCommand(),
            set_threshold_filter_criteria: (value: string) => this.handleSetThresholdFilterCriteriaCommand(value),
            get_threshold_filter_criteria: () => this.handleGetThresholdFilterCriteriaCommand(),
            get_threshold_filter_confidence: () => this.handleGetThresholdFilterConfidenceCommand(),
            set_threshold_filter_confidence: (value: number) => this.handleSetThresholdFilterConfidenceCommand(value),
            get_threshold_filter_config: () => this.handleGetThresholdFilterConfigCommand(),
            get_model_info: () => this.handleGetModelInfoCommand(),
            clear_cache: () => this.handleClearCacheCommand(),
            clear_cache_file: (value: string) => this.handleClearFileInCacheCommand(value),
            reset_metrics: () => this.handleResetMetricsCommand()
        };

        // sanitize the poll sleep time number
        this._pollSleepTime = Number((<string>process.env.EI_IOTCORE_POLL_SLEEP_TIME_MS));

        if (this._pollSleepTime === undefined || Number.isNaN(this._pollSleepTime) || this._pollSleepTime <= 100) {
            this.logInfo("No polling sleep time specified. Defaulting to " + DEFAULT_POLLING_TIME_MS + "ms");
            this._pollSleepTime = DEFAULT_POLLING_TIME_MS;
        }

        // We can slow down the publication to IoTCore to save IoTCore message cost$.
        // set "iotcore_backoff" in Greengrass component config to "n" > 0 to enable
        // countdown backoff... "-1" to disable... (default: "-1")
        this._delayInferences = this.sanitizeDelayInferences(Number(process.env.EI_OUTPUT_BACKOFF_COUNT));

        // optional write to file configuration
        this._enableWriteToFile = sanitizeYesNo((<string>process.env.EI_ENABLE_WRITE_TO_FILE));
        this._writeToFileDir = this.sanitizeString((<string>process.env.EI_FILE_WRITE_DIRECTORY));

        // optional write to S3 configuration
        this._enableWriteToS3 = sanitizeYesNo((<string>process.env.EI_ENABLE_WRITE_TO_S3));
        this._s3Bucket = this.sanitizeString((<string>process.env.EI_S3_BUCKET));

        // initalize the threshold filter
        this.initThresholdFilter();

        // sanitize and inititalize the metrics collector
        this._metricsDispatchSleepTimeMS = Number((process.env.EI_IOTCORE_METRICS_DISPATCH_TIME_MS));
        if (this._metricsDispatchSleepTimeMS === undefined
            || Number.isNaN(this._metricsDispatchSleepTimeMS)
            || this._metricsDispatchSleepTimeMS <= 100) {
            this.logInfo("No metrics sleep time specified. Defaulting to "
                        + DEFAULT_METRICS_COLLECTION_TIME_MS + "ms...");
            this._metricsDispatchSleepTimeMS = DEFAULT_METRICS_COLLECTION_TIME_MS;
        }
        this._metricsCollector = new MetricsCollector();
    }

    sanitizeString(value: string): string {
        return value || "__none__";
    }

    sanitizeDelayInferences(value: number): number {
        return !Number.isNaN(value) && value > 0 ? value : -1;
    }

    sanitizeQoS(value: number): number {
        return !Number.isNaN(value) && value > 0 && value < 4 ? value : 0;
    }

    private sanitizeThresholdValue(value: number): number {
        if (!Number.isNaN(value) && value > 0 && value <= 1.0) {
            return value;
        }
        return DEFAULT_THRESHOLD_VALUE;
    }

    private sanitizeThresholdCriteria(value: string): Criteria {
        return Object.values(Criteria).includes(value as Criteria) ? value as Criteria : DEFAULT_THRESHOLD_CRITERIA;
    }

    // initialize the optional threshold confidence filter
    initThresholdFilter() {
        const opts: ThresholdFilterOptions = {
            default_threshold:
                this.sanitizeThresholdValue(Number(<string>process.env.EI_DEFAULT_THRESHOLD)),
            threshold_criteria:
                this.sanitizeThresholdCriteria(<string>process.env.EI_THRESHOLD_CRITERIA),
        };
        this._thresholdFilter = new ThresholdFilter(opts);
    }

    // initialize the model info object instance
    initModelInfo(modelName: string, modelVersion: string, modelParams?: ModelParams) {
        this._modelInfo = new ModelInfo(modelName, modelVersion, modelParams);
    }

    // initialize the S3 processor
    private s3Init() {
        if (this._enableWriteToS3 !== BinaryStatus.YES) {
            return;
        }
        if (!this._s3Client) {
            try {
                this._s3Client = new S3Client(this._clientConfig);
            }
            catch (err) {
                this.logError(`Unable to allocate S3Client with exception`, err as Error);
            }
        }
    }

    async connect() {
        if (this._iot) {
            return this.isConnected();
        }

        this.logInfo(PREFIX + ' EI: Connecting to IoTCore...');

        this._inferenceOutputTopic = process.env.EI_INFERENCE_OUTPUT_TOPIC;
        this._metricsOutputTopic = process.env.EI_METRICS_OUTPUT_TOPIC;
        this._commandInputTopic = process.env.EI_COMMAND_INPUT_TOPIC;
        this._commandOutputTopic = process.env.EI_COMMAND_OUTPUT_TOPIC;

        try {
            if (!this._iot) {
                this._iot = new IoTDataPlaneClient(this._clientConfig);
            }
            this.s3Init();

            await this.sendCommandResult({
                status: 'started',
                ts: Date.now(),
                id: uuidv4()
            });
        }
        catch (err) {
            this.logError(`Unable to allocate IoTDataPlaneClient`, err as Error);

            if (this._iot) {
                this._iot.destroy();
                this._iot = undefined;
            }
        }
        return this.isConnected();
    }

    isConnected() {
        return this._iot !== undefined;
    }

    isEmptyInference(payload: Payload, key: AwsResultKey) {
        if (payload && key in payload) {
            const value = payload[key];

            if (Array.isArray(value) && value.length > 0) {
                return false;
            }

            // Check if it's an object and not empty
            if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
                return false;
            }
        }
        return true;
    }

    initializeAsyncCollectors() {
        this.logInfo("Launching metrics collector...");
        void this.dispatchMetricsCollector(this._metricsDispatchSleepTimeMS);

        this.logInfo("Launching command receiver...");
        void this.dispatchCommandListener(this._commandInputTopic, this._pollSleepTime);
    }

    private async clearRetainedQueue(topic?: string) {
        if (!this._iot) {
            return;
        }
        try {
            // publish, do not proceed until this message has been cleared
            await this._iot.send(new PublishCommand({
                topic,
                retain: true
            }));
        }
        catch (err) {
            // ignore
        }
    }

    processRestartCommand() {
        this.logInfo("processRestartCommand(): Restarting Runner: " + this._opts?.appName + "...");

        // send ourselves a single to gracefully shutdown...
        process.kill(process.pid, "SIGINT");
    }

    // metrics collector process
    async dispatchMetricsCollector(sleepMS: number) {
        while (this.isConnected()) {
            try {
                if (this._iot && this._metricsCollector) {
                    await this.sendModelMetrics(this._metricsCollector);
                }
            }
            catch (err) {
                // ignore
            }

            await this.sleep(sleepMS);
        }

        this.logWarning("dispatchMetricsCollector() WARNING: process loop has halted...");
    }

    resetMetrics(): CommandResultPayload {
        if (this._metricsCollector) {
            return this._metricsCollector.reset();
        }
        return { "metrics_reset": AWSStatus.SUCCESS };
    }

    async dispatchCommandListener(topic: string | undefined, longPollSleepMS: number) {
        while (this.isConnected()) {
            if (!this._iot) {
                this.logWarning("WARNING Status connected() but iotcore handle does not exist");
                await this.sleep(longPollSleepMS);
                continue;
            }

            try {
                const response = await this._iot.send(new GetRetainedMessageCommand({ topic }));
                if (response?.payload) {
                    await this.clearRetainedQueue(topic);
                    const rcvdCmd = new TextDecoder().decode(response.payload);
                    const receivedCmdObject = JSON.parse(rcvdCmd) as Command;
                    await this.processCommand(receivedCmdObject);
                }
            }
            catch (err) {
                // ignore
            }

            await this.sleep(longPollSleepMS);
        }
    }

    private async processCommand(rcvdCmd: Command) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const cmd = rcvdCmd.cmd as keyof typeof this.commands;
        if (!this.commands[cmd]){
            this.logInfo(`Command: ${cmd} not supported.`);
            return;
        }

        const commandMethod = this.commands[cmd];
        if (commandMethod.length > 0) { // See if it accepts a parameter
            await commandMethod(rcvdCmd.value);
        }
        else {
            await commandMethod();
        }
    }

    private async handleRestartCommand() {
        this.logInfo("dispatchCommandListener(): restarting runner process...");
        await this.sendCommandResult({ "restart": AWSStatus.SUCCESS });
        this.processRestartCommand();
    }

    private async handleGetThresholdFilterConfidenceCommand() {
        if (this._thresholdFilter) {
            this.logInfo("dispatchCommandListener(): getting threshold filter confidence setting...");
            await this.sendCommandResult({ "confidence_threshold": this._thresholdFilter.threshold });
        }
    }

    private async handleSetThresholdFilterConfidenceCommand(value: number) {
        if (!this._thresholdFilter) {
            return;
        }

        if (this._thresholdFilter.isThresholdValueInBounds(value)) {
            this.logInfo(`dispatchCommandListener(): Setting threshold filter confidence threshold to: ${value}`);
            this._thresholdFilter.threshold = value;
        }
        else {
            this.logWarning(`dispatchCommandListener(): Unable to set threshold filter confidence threshold to: ${value} Threshold value must be 0 < x < 1.0. No changes made.`);
        }
        await this.sendCommandResult({ "confidence_threshold": this._thresholdFilter.threshold });
    }

    private async handleGetThresholdFilterCriteriaCommand() {
        if (this._thresholdFilter) {
            this.logInfo("dispatchCommandListener(): getting threshold criteria setting...");
            await this.sendCommandResult({ "criteria": this._thresholdFilter.criteria });
        }
    }

    private async handleSetThresholdFilterCriteriaCommand(value: string) {
        if (this._thresholdFilter) {
            this.logInfo(`dispatchCommandListener(): Setting threshold criteria to: ${value}`);
            const sanitized = this.sanitizeThresholdCriteria(value);
            this._thresholdFilter.criteria = sanitized;
            await this.sendCommandResult({ criteria: sanitized });
        }
    }

    private async handleEnableThresholdFilterCommand() {
        if (this._thresholdFilter) {
            this.logInfo("dispatchCommandListener(): enabling threshold filter...");
            this._thresholdFilter.enable();
            await this.sendCommandResult({
                "threshold_filter_config": this._thresholdFilter.toJSON()
            });
        }
    }

    private async handleDisableThresholdFilterCommand() {
        if (this._thresholdFilter) {
            this.logInfo("dispatchCommandListener(): disabling threshold filter...");
            this._thresholdFilter.disable();
            await this.sendCommandResult({
                "threshold_filter_config": this._thresholdFilter.toJSON()
            });
        }
    }

    private async handleGetThresholdFilterConfigCommand() {
        if (this._thresholdFilter) {
            this.logInfo("dispatchCommandListener(): getting current threshold filter config...");
            await this.sendCommandResult({ "threshold_filter_config": this._thresholdFilter.toJSON() });
        }
    }

    private async handleGetModelInfoCommand() {
        if (this._modelInfo) {
            this.logInfo("dispatchCommandListener(): getting current model information...");
            await this.sendCommandResult({ "model_info": this._modelInfo.toJSON() });
        }
    }

    private async handleClearCacheCommand() {
        if (this._modelInfo) {
            this.logInfo("dispatchCommandListener(): Clearing inference file/json cache...");
            await this.sendCommandResult({
                "clear_cache": await this.cacheClear()
            });
        }
    }

    private async handleClearFileInCacheCommand(value: string) {
        if (this._modelInfo && value) {
            this.logInfo(`dispatchCommandListener(): Clearing inference file/json from cache. UUID: ${value}`);
            await this.sendCommandResult({
                "clear_cache_file": await this.cacheClearInferenceAndImageByUUID(value)
             });
        }
    }

    private async handleResetMetricsCommand() {
        if (this._metricsCollector) {
            this.logInfo("dispatchCommandListener(): Resetting metrics collection...");
            await this.sendCommandResult(this.resetMetrics());
        }
    }

    private logWarning(message: string) {
        if (this._notSilent) {
            console.warn(PREFIX, message);
        }
    }

    private logInfo(message: string): void {
        if (this._notSilent) {
            console.log(PREFIX, message);
        }
    };

    private logError(message: string, err?: Error): void {
        let errStr = message;
        if (err) {
            errStr += `\nError: ${err.name} - ${err.message}`;
            if (err.stack) {
                errStr += `Stack Trace: ${err.stack}`;
            }
        }
        console.error(PREFIX, errStr);
    };

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sendCommandResult(payload: CommandResultPayload) {
        // Return early if not connected to IoTCore or if there's no output topic
        if (!this._iot || !this.isConnected()) {
            this.logWarning('Not connected to IoTCore, not sending command result.');
            return;
        }

        if (!this._commandOutputTopic || this._commandOutputTopic.length === 0) {
            this.logWarning(
                'No command output topic specified in configuration, not sending result.'
            );
            return;
        }

        // Publish the command result
        try {
            await this._iot.send(
                new PublishCommand({
                    topic: this._commandOutputTopic,
                    qos: this._iotcoreQoS,
                    retain: false,
                    payload: Buffer.from(JSON.stringify({ result: payload }))
                })
            );
        }
        catch (err) {
            this.logError(`IoTDataPlaneClient.send()`, err as Error);
        }
    }

    // update confidence metrics
    updateInferenceMetrics(confidences: number[]) {
        if (this._metricsCollector) {
            this._metricsCollector.updateConfidenceMetrics(confidences);
        }
    }

    /**
     * Sends model metrics to IoT Core using the configured metrics topic
     * @param metrics The metrics payload to send (typically from MetricsCollector.toJSON())
     * @returns Promise that resolves when the message is sent or rejects on error
     */
    async sendModelMetrics(metrics: MetricsCollector): Promise<void> {
        // Check connection and topic configuration
        if (!this.isConnected()) {
            this.logInfo(`sendModelMetrics(): Not connected to IoTCore, not sending model metrics`);
            return;
        }

        if (!this._metricsOutputTopic) {
            this.logInfo(`sendModelMetrics(): No model metrics topic specified in configuration, not sending model metrics`);
            return;
        }

        // Publish to IoT Core
        try {
            await this._iot?.send(new PublishCommand({
                topic: this._metricsOutputTopic,
                qos: this._iotcoreQoS,
                retain: false,
                payload: Buffer.from(JSON.stringify(metrics))
            }));
        }
        catch (error) {
            this.logError(`sendModelMetrics(): IoTDataPlaneClient.send() failed`, error as Error);
        }
    }

    // OPTION: cache inference image and inference json to local directory on edge device...
    async saveToFile(payload: Payload, imgAsJpg: Buffer): Promise<AWSStatus> {
        const filenameBase = path.join(this._writeToFileDir, payload.id);

        try {
            await Promise.all([
                fs.writeFile(filenameBase + ".json", JSON.stringify(payload)),
                fs.writeFile(filenameBase + ".img", imgAsJpg)
            ]);

            return AWSStatus.SUCCESS;
        }
        catch (error) {
           this.logError("Error saving files", error as Error);
           return AWSStatus.FAILED;
        }
    }

    // create the prefix used to store the inference/image into the S3 bucket
    createS3Prefix() {
        return `${this._modelInfo?.name}_${this._modelInfo?.version}/`;
    }

    // OPTION: cache inference image and inference json to S3 bucket
    async saveToS3(payload: Payload, imgAsJpg: Buffer): Promise<AWSStatus> {
        // Early return if S3 client is not available
        if (this._s3Client === undefined) {
            return AWSStatus.SUCCESS; // Consider returning a different status for this case
        }

        const basePath = this.createS3Prefix();
        const imageFilename = basePath + payload.id + '.img';
        const infFilename = basePath + payload.id + '.json';

        try {
            try {
                await this._s3Client.send(
                    new CreateBucketCommand({ Bucket: this._s3Bucket })
                );
            }
            catch (err: unknown) {
                // It's expected to get an error if bucket already exists, so we'll just continue
                if (
                    (err as Error).name !== 'BucketAlreadyOwnedByYou' &&
                    (err as Error).name !== 'BucketAlreadyExists'
                ) {
                    this.logError(`saveToS3(): Failed to create bucket`, err as Error);
                    throw err; // Re-throw to be caught by outer try/catch
                }
            }

            await Promise.all([
                // Upload the image file
                this._s3Client.send(
                    new PutObjectCommand({
                        Bucket: this._s3Bucket,
                        Key: imageFilename,
                        Body: imgAsJpg
                    })
                ),

                // Upload the inference JSON file
                this._s3Client.send(
                    new PutObjectCommand({
                        Bucket: this._s3Bucket,
                        Key: infFilename,
                        Body: JSON.stringify(payload)
                    })
                )
            ]);

            return AWSStatus.SUCCESS;
        }
        catch (err) {
            this.logError("saveToS3() Failed to upload files", err as Error);
            return AWSStatus.FAILED;
        }
    }

    // process option to delete cache file (local) identified by its uuid
    async localFileCacheClearFileByUUID(uuid: string): Promise<AWSStatus> {
        const filenameBase = path.join(this._writeToFileDir, uuid);
        const imageFilename = filenameBase + '.img';
        const infFilename = filenameBase + '.json';

        try {
            // Check existence and delete files
            const [ imageExists, infExists ] = await Promise.all([
                fileExists(imageFilename),
                fileExists(infFilename)
            ]);

            // Delete files if they exist (running operations concurrently)
            const deleteOperations = [];

            if (imageExists) {
                deleteOperations.push(
                    fs
                        .unlink(imageFilename)
                        .catch((err) => {
                            this.logError(
                                `localFileCacheClearFileByUUID(): unable to remove file: ${imageFilename}`,
                                err as Error
                            );
                            return false;
                        })
                        .then(() => true)
                );
            }
            else {
                this.logInfo(
                    `localFileCacheClearFileByUUID(): file not found: ${imageFilename}`
                );
            }

            if (infExists) {
                deleteOperations.push(
                    fs
                        .unlink(infFilename)
                        .catch((err) => {
                            this.logError(
                                `localFileCacheClearFileByUUID(): unable to remove file: ${infFilename}`, err as Error
                            );
                            return false;
                        })
                        .then(() => true)
                );
            }
            else {
                this.logInfo(
                    `localFileCacheClearFileByUUID(): file not found: ${infFilename}`
                );
            }

            // Wait for all delete operations to complete
            const results = await Promise.all(deleteOperations);

            // If any operation failed or if no files were found when they should exist, return FAILED
            if (
                results.includes(false) ||
                (deleteOperations.length === 0 &&
                    ((await fileExists(imageFilename)) || (await fileExists(infFilename))))
            ) {
                return AWSStatus.FAILED;
            }

            return AWSStatus.SUCCESS;
        }
        catch (err) {
            this.logError(
                `localFileCacheClearFileByUUID(): error in file operation`, err as Error
            );
            return AWSStatus.FAILED;
        }
    }

    // process option to delete cache file (s3) identified by its uuid
    async s3CacheClearByUUID(uuid: string): Promise<AWSStatus> {
        if (!this._s3Client) {
            return AWSStatus.SUCCESS;
        }

        const basePath = `${this._modelInfo?.name}_${this._modelInfo?.version}/`;
        const bucketParams = { Bucket: this._s3Bucket, Prefix: basePath };
        let found = false;

        try {
            // List S3 objects with the given prefix (basePath)
            const { Contents } = await this._s3Client.send(new ListObjectsV2Command(bucketParams));

            if (Contents) {
                for (const content of Contents) {
                    if (content?.Key?.includes(uuid)) {
                        found = true;
                        const delCommand = { Bucket: this._s3Bucket, Key: content.Key };
                        this.logInfo(`s3CacheClearByUUID(): Deleting: ${JSON.stringify(delCommand)}`);
                        await this._s3Client.send(new DeleteObjectCommand(delCommand));
                    }
                }
            }
        }
        catch (err) {
            this.logError(`s3CacheClearByUUID(): Error clearing file in S3 cache: ${JSON.stringify({
                bucket: this._s3Bucket,
                basePath,
                uuid
            })}`, err as Error);
            return AWSStatus.FAILED;
        }

        // If no matching file was found, return FAILED status
        if (!found) {
            this.logError(`${PREFIX} s3CacheClearByUUID(): No file found with UUID: ${uuid} in ${this._s3Bucket}/${basePath}`);
            return AWSStatus.FAILED;
        }

        return AWSStatus.SUCCESS;
    }

    async localFileCacheClear(): Promise<AWSStatus> {
        const directoryPath = this._writeToFileDir;

        if (!(await fileExists(directoryPath))) {
            this.logError(`localFileCacheClear(): Directory not found: ${directoryPath}`);
            return AWSStatus.FAILED;
        }

        try {
            const files = await fs.readdir(directoryPath);
            if (files.length === 0) {
                this.logInfo(`localFileCacheClear(): No files to clear in ${directoryPath}`);
                return AWSStatus.SUCCESS;
            }

            for (const file of files) {
                const filePath = path.join(directoryPath, file);
                try {
                    await fs.unlink(filePath);
                    this.logInfo(`localFileCacheClear(): Successfully deleted file: ${filePath}`);
                }
                catch (err) {
                    this.logError(`localFileCacheClear(): Failed to remove file ${filePath}`, err as Error);
                    return AWSStatus.FAILED;
                }
            }
        }
        catch (err) {
            this.logError(`Error clearing local file cache in directory: ${directoryPath}.`, err as Error);
            return AWSStatus.FAILED;
        }

        return AWSStatus.SUCCESS;
    }

    async s3CacheClear(): Promise<AWSStatus> {
        const basePath = path.join(
            `${this._modelInfo?.name}_${this._modelInfo?.version}/`
        );

        if (!this._s3Client) {
            this.logWarning("s3CacheClear(): S3 client is undefined");
            return AWSStatus.SUCCESS;
        }

        const bucketParams = { Bucket: this._s3Bucket, Prefix: basePath };

        try {
            // List objects in the S3 bucket with the given prefix (basePath)
            const { Contents } = await this._s3Client.send(new ListObjectsV2Command(bucketParams));

            if (!Contents || Contents.length === 0) {
                return AWSStatus.SUCCESS;
            }

            // Iterate through contents and delete them asynchronously
            const deletePromises = Contents.map(async (content) => {
                const delCommand = { Bucket: this._s3Bucket, Key: content.Key };
                try {
                    this.logInfo(`s3CacheClear(): Deleting: ${JSON.stringify(delCommand)}`);
                    if (this._s3Client) {
                        await this._s3Client.send(new DeleteObjectCommand(delCommand));
                    }
                }
                catch (err) {
                    this.logError(`s3CacheClear(): Error deleting file ${content.Key}`, err as Error);
                    throw err;
                }
            });

            try {
                await Promise.all(deletePromises);
            }
            catch {
                return AWSStatus.FAILED;
            }
        }
        catch (err) {
            this.logError(`s3CacheClear(): Error while clearing S3 cache`, err as Error);
            return AWSStatus.FAILED;
        }
        return AWSStatus.SUCCESS;
    }

    // Caches inference results to local file system and/or S3
    async cacheInferenceImageAndJSON(payload: Payload, imgAsJpg: Buffer) {
        const result = {
            local: AWSStatus.SUCCESS,
            s3: AWSStatus.SUCCESS,
            uuid: payload.id
        };

        // Skip if no image data is provided
        if (!imgAsJpg) {
            return result;
        }

        const tasks = [];

        if (this._enableWriteToFile === BinaryStatus.YES) {
            tasks.push(this.saveToFile(payload, imgAsJpg).then(status => result.local = status));
        }

        if (this._enableWriteToS3 === BinaryStatus.YES) {
            tasks.push(this.saveToS3(payload, imgAsJpg).then(status => result.s3 = status));
        }

        await Promise.all(tasks);

        return result;
    }

    // process option to delete inference image + json from cache via its uuid...
    async cacheClearInferenceAndImageByUUID(uuid: string) {
        let result = { local: AWSStatus.SUCCESS, s3: AWSStatus.SUCCESS, uuid };

        const tasks = [];

        // clear local directory/file cache
        if (this._enableWriteToFile === BinaryStatus.YES) {
            this.logInfo("cacheClearInferenceAndImageByUUID(): Clearing file(s) locally cached prefixed by UUID: " + uuid);
            tasks.push(this.localFileCacheClearFileByUUID(uuid).then(status => result.local = status));
        }

        // clear the S3 cache
        if (this._enableWriteToS3 === BinaryStatus.YES) {
            this.logInfo("cacheClearInferenceAndImageByUUID(): Clearing file(s) in S3 prefixed by UUID: " + uuid);
            tasks.push(this.s3CacheClearByUUID(uuid).then(status => result.s3 = status));
        }

        await Promise.all(tasks);
        return result;
    }

    // process command to clear the inference image and inference json cache...
    async cacheClear(): Promise<{
        local: AWSStatus;
        s3: AWSStatus;
    }> {
        let result = { local: AWSStatus.SUCCESS, s3: AWSStatus.SUCCESS };

        const tasks = [];

        // clear local directory/file cache
        if (this._enableWriteToFile === BinaryStatus.YES) {
            this.logInfo("Clearing local file cache...");
            tasks.push(this.localFileCacheClear().then(status => result.local = status));
        }

        // clear the S3 cache
        if (this._enableWriteToS3 === BinaryStatus.YES) {
            this.logInfo("Clearing S3 cache...");
            tasks.push(this.s3CacheClear().then(status => result.s3 = status));
        }

        await Promise.all(tasks);
        return result;
    }

    // send inference to IoTCore (optionally add Base64 encoded inference image if not too big...)
    async sendInference(
        meanConfidence: number,
        payload: Payload,
        key: AwsResultKey,
        imgAsJpg?: Buffer
    ): Promise<void> {
        if (
            !this._iot ||
            !this.isConnected() ||
            !this._inferenceOutputTopic ||
            this._inferenceOutputTopic.length === 0
        ) {
            if (this.isConnected()) {
                this.logError("No model inference publication topic specified in configuration... not sending inference results.");
            }
            else {
                this.logError("Not connected to IoTCore... not sending inference.");
            }
            return;
        }

        if (this.isEmptyInference(payload, key)) {
            return;
        }

        // Set S3 information
        payload.s3_bucket = "unset";
        payload.s3_prefix = "unset";

        if (
            this._enableWriteToS3 === BinaryStatus.YES && this._s3Bucket
        ) {
            payload.s3_bucket = this._s3Bucket;
            payload.s3_prefix = this.createS3Prefix();
        }

        // Prepare the data
        const data = Buffer.from(JSON.stringify(payload));

        // Check if we should publish based on confidence threshold
        const meetsThreshold = !this._thresholdFilter ||
            !this._thresholdFilter.isEnabled() ||
            this._thresholdFilter.meetsThresholdCriteria(meanConfidence);

        if (!meetsThreshold) {
            return;
        }

        // Warn if payload exceeds max size
        if (data.length >= IOTCORE_MAX_PAYLOAD) {
            this.logWarning(
            `sendInference() WARNING: IoTCore message length ${data.length} bytes is larger than the maximum allowed payload size of ${IOTCORE_MAX_PAYLOAD} bytes! Message may not be published.`
            );
        }

        // Handle delayed inference publishing
        if (this._delayInferences > 0) {
            this._delayCountdown = (this._delayCountdown ?? 0) + 1;

            if (this._delayCountdown < this._delayInferences) {
                return;
            }

            // Reset countdown
            this._delayCountdown = 0;
        }

        // Publish the message
        try {
            await this._iot.send(new PublishCommand({
                topic: this._inferenceOutputTopic,
                qos: this._iotcoreQoS,
                payload: data
            }));

            // Cache the inference image if provided
            if (imgAsJpg) {
                await this.cacheInferenceImageAndJSON(payload, imgAsJpg);
            }
        }
        catch (err) {
            this.logError(`sendInference() error: IoTDataPlaneClient.send()`, err as Error);
        }
    }
}