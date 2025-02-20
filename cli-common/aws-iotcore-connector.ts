import { IoTDataPlaneClient, PublishCommand, GetRetainedMessageCommand } from "@aws-sdk/client-iot-data-plane";
import { S3Client, CreateBucketCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PREFIX = '\x1b[34m[AWS_IOTCORE_CONNECTOR]\x1b[0m';

// maximum size of IoTCore Message
const IOTCORE_MAX_PAYLOAD = 131072;

// number of digits to the right of the decimal...
const NUM_PLACES = 6;

// Default metrics collector interval in MS
const DEFAULT_METRICS_COLLECTION_TIME_MS = 60000; // 60 seconds

// Default polling interval in MS
const DEFAULT_POLLING_TIME_MS = 2500; // 2.5 seconds

// Default Threshold value
const DEFAULT_THRESHOLD_VALUE = 0.70; // 70% confidence minimum

// Default Threshold Criteria
const DEFAULT_THRESHOLD_CRITERIA = "ge";  // ">="

// threshold filter class
export class ThresholdFilter {
    private _enabled: string;
    private _confidenceThreshold: number;
    private _confidenceThresholdCriteria: string;

    constructor(opts: {
        default_threshold: number;
        threshold_criteria: string;
    }) {
        this._confidenceThreshold = opts.default_threshold;
        this._confidenceThresholdCriteria = opts.threshold_criteria;
        this._enabled = this.sanizeYesNo(<string>process.env.EI_ENABLE_THRESHOLD_LIMIT);
    }

    // sanitize yes/no options
    sanizeYesNo(value: string): string {
        if (value !== undefined && value !== "") {
            if (value.toLowerCase() === "yes") {
                return "yes";
            }
            if (value.toLowerCase() === "no") {
                return "no";
            }
        }
        return "no";
    }

    // get the confidence threshold
    getConfidenceThreshold(): number {
        return this._confidenceThreshold;
    }

    // confirm confidence threshold in bounds
    confidenceThresholdValueInBounds(threshold: number): boolean {
        return (threshold > 0 && threshold <= 1.0);
    }

    // set the confidence threshold
    setConfidenceThreshold(threshold: number): number {
        this._confidenceThreshold = threshold;
        return this.getConfidenceThreshold();
    }

    // get the confidence criteria
    getConfidenceCriteria(): string {
        return this._confidenceThresholdCriteria;
    }

    // set the confidence criteria
    setConfidenceCriteria(criteria: string): string {
        this._confidenceThresholdCriteria = criteria.toLowerCase();
        return this.getConfidenceCriteria();
    }

    // enable the filter
    enable() {
        this._enabled = "yes";
    }

    // disable the filter
    disable() {
        this._enabled = "no";
    }

    // meets criteria?
    meetsThresholdCriteria(threshold: number): boolean {
        let result: boolean = false;
        if (this._confidenceThresholdCriteria === "gt") {
            result = (threshold > this._confidenceThreshold);
        }
        if (this._confidenceThresholdCriteria === "ge") {
            result = (threshold >= this._confidenceThreshold);
        }
        if (this._confidenceThresholdCriteria === "eq") {
            result = (threshold === this._confidenceThreshold);
        }
        if (this._confidenceThresholdCriteria === "le") {
            result = (threshold <= this._confidenceThreshold);
        }
        if (this._confidenceThresholdCriteria === "lt") {
            result = (threshold < this._confidenceThreshold);
        }
        return result;
    }

    // valid criteria
    validCriteria(criteria: string): boolean {
        return (criteria !== undefined && criteria !== "" &&
            ((criteria.toLowerCase() === "gt") ||
            (criteria.toLowerCase() === "ge")  ||
            (criteria.toLowerCase() === "eq")  ||
            (criteria.toLowerCase() === "le")  ||
            (criteria.toLowerCase() === "lt")));
    }

    // filter enabled
    enabled(): boolean {
        return (this._enabled === "yes");
    }

    // get threshold filter config info as JSON
    json(): any {
        return {
            "enabled": this._enabled,
            "confidence_threshold": this._confidenceThreshold,
            "threshold_criteria": this._confidenceThresholdCriteria,
        };
    }
};

// model info class
export class ModelInfo {
    private _modelName: string;
    private _modelVersion: string;
    private _modelParams: any | undefined;

    constructor(opts: {
        model_name: string;
        model_version: string;
        model_params: any;
    }) {
        this._modelName = opts.model_name;
        this._modelVersion = opts.model_version;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this._modelParams = opts.model_params;
    }

    // get model name
    getModelName(): string {
        return this._modelName;
    }

    // get model version
    getModelVersion(): string {
        return this._modelVersion;
    }

    // get model params
    getModelParams(): any {
        return this._modelParams;
    }

    // get model info as JSON
    json(): any {
        return {
            "model_name": this._modelName,
            "model_version": this._modelVersion,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            "model_params": this._modelParams,
        };
    }
}

// metrics collector class
export class MetricsCollector {
    private _count: number;
    private _sumConfidences: number;
    private _sumSquaredConfidences: number;
    private _meanConfidenceTrend: string;

    constructor() {
        this._count = 0;
        this._sumConfidences = 0;
        this._sumSquaredConfidences = 0;
        this._meanConfidenceTrend = "flat";
    }

    // get the average confidence
    getMeanConfidence(): number {
        if (this._sumConfidences > 0 && this._count > 0) {
            return (this._sumConfidences / this._count);
        }
        return 0.0;
    }

    // reset
    reset(): object {
        this._count = 0;
        this._sumConfidences = 0;
        this._sumSquaredConfidences = 0;
        this._meanConfidenceTrend = "flat";
        return { "metrics_reset": "OK"};
    }

    // update the conference average stat
    updateConfidenceMean(confidence: number) {
        // get the previous confidence
        const prevMeanConfidence = this.getMeanConfidence();

        // add the confidence
        this._sumConfidences += confidence;
        this._sumSquaredConfidences += (confidence * confidence);
        ++this._count;
        const newAdverageConfidence = this.getMeanConfidence();

        // update the average confidence trend
        const trend = newAdverageConfidence - prevMeanConfidence;
        if (trend > 0) {
            this._meanConfidenceTrend = "incr";
        }
        if (trend === 0) {
            this._meanConfidenceTrend = "flat";
        }
        if (trend < 0) {
            this._meanConfidenceTrend = "decr";
        }
    }

    // update metrics
    updateConfidenceMetrics(confidences: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        for (let i = 0; i < confidences.length; ++i) {
            // update confidence average
            // eslint-disable-next-line @stylistic/max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
            this.updateConfidenceMean(confidences[i]);
        }
    }

    // get metrics as a JSON
    json(): any {
        return {
            "mean_confidence": Number(this.getMeanConfidence().toFixed(NUM_PLACES)),
            "standard_deviation": Number(this.getStandardDeviation().toFixed(NUM_PLACES)),
            "confidence_trend": this._meanConfidenceTrend,
            "details": {
                "n": this._count,
                "sum_confidences": Number(this._sumConfidences.toFixed(NUM_PLACES)),
                "sum_confidences_squared": Number(this._sumSquaredConfidences.toFixed(NUM_PLACES)),
            },
            "ts": Date.now(),
            "id": uuidv4(),
        };
    }

    // get the standard deviation
    getStandardDeviation(): number {
        if (this._sumSquaredConfidences > 0 && this._count > 0) {
            const mean = this.getMeanConfidence();
            return Math.sqrt((this._sumSquaredConfidences / this._count) - (mean * mean));
        }
        return 0.0;
    }
};

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

// Primary AWS IoTCore Connector/Processor class
export class AWSIoTCoreConnector {

    private _notSilent: boolean;
    private _inferenceOutputTopic: string;
    private _metricsOutputTopic: string;
    private _commandInputTopic: string;
    private _commandOutputTopic: string;
    private _iot: IoTDataPlaneClient | undefined;
    private _clientConfig;
    private _iotcoreQoS: number;
    private _connected: boolean;
    private _delayCountdown: number;
    private _delayInferences: number;
    private _poolSleepTimeMS: number;
    private _opts: any | undefined;
    private _enableWriteToFile: string;
    private _writeToFileDir: string;
    private _metricsCollector: MetricsCollector | undefined;
    private _thresholdFilter: ThresholdFilter | undefined;
    private _modelInfo: ModelInfo | undefined;
    private _metricsDispatchSleepTimeMS: number;
    private _enableWriteToS3: string;
    private _s3Bucket: string;
    private _s3Client: S3Client | undefined;

    constructor(opts: {
        appName: string,
        silentArgv: boolean,
        cleanArgv: boolean,
        apiKeyArgv: string | undefined,
        greengrassArgv: boolean,
        devArgv: boolean,
        hmacKeyArgv: string | undefined,
        connectProjectMsg: string,
    }) {
        this._notSilent = (!opts.silentArgv);
        this._inferenceOutputTopic = "";
        this._metricsOutputTopic = "";
        this._commandInputTopic = "";
        this._commandOutputTopic = "";

        this._clientConfig = { region: process.env.AWS_REGION };
        this._iot = undefined;
        this._connected = false;
        this._delayCountdown = 0;
        this._iotcoreQoS = this.sanitizeQoS(Number((<string>process.env.EI_IOTCORE_QOS)));
        this._opts = opts;

        // sanitize the poll sleep time number
        this._poolSleepTimeMS = Number((<string>process.env.EI_IOTCORE_POLL_SLEEP_TIME_MS));
        if (this._poolSleepTimeMS === undefined
             || Number.isNaN(this._poolSleepTimeMS)
             || this._poolSleepTimeMS <= 100) {
            console.log(PREFIX + ": no polling sleep time specified. Defaulting to "
                    + DEFAULT_POLLING_TIME_MS + "ms...");
            this._poolSleepTimeMS = DEFAULT_POLLING_TIME_MS;
        }

        // We can slow down the publication to IoTCore to save IoTCore message cost$.
        // set "iotcore_backoff" in Greengrass component config to "n" > 0 to enable
        // countdown backoff... "-1" to disable... (default: "-1")
        this._delayInferences = this.sanitizeDelayInferences(Number((<string>process.env.EI_OUTPUT_BACKOFF_COUNT)));

        // optional write to file configuration
        this._enableWriteToFile = this.sanizeYesNo((<string>process.env.EI_ENABLE_WRITE_TO_FILE));
        this._writeToFileDir = this.sanitizeString((<string>process.env.EI_FILE_WRITE_DIRECTORY));

        // optional write to S3 configuration
        this._enableWriteToS3 = this.sanizeYesNo((<string>process.env.EI_ENABLE_WRITE_TO_S3));
        this._s3Bucket = this.sanitizeString((<string>process.env.EI_S3_BUCKET));

        // initalize the threshold filter
        this.initThresholdFilter();

        // sanitize and inititalize the metrics collector
        this._metricsDispatchSleepTimeMS = Number((<string>process.env.EI_IOTCORE_METRICS_DISPATCH_TIME_MS));
        if (this._metricsDispatchSleepTimeMS === undefined
            || Number.isNaN(this._metricsDispatchSleepTimeMS)
            || this._metricsDispatchSleepTimeMS <= 100) {
            console.log(PREFIX + ": no metrics sleep time specified. Defaulting to "
                        + DEFAULT_METRICS_COLLECTION_TIME_MS + "ms...");
            this._metricsDispatchSleepTimeMS = DEFAULT_METRICS_COLLECTION_TIME_MS;
        }
        this.initMetricsCollector();
    }

    // sanitize string
    sanitizeString(value: string): string {
        if (value !== undefined && value !== "") {
            return value;
        }
        return "__none__";
    }

    // sanitize delay inferences
    sanitizeDelayInferences(value: number): number {
        if (value !== undefined && !Number.isNaN(value)) {
            if (value <= 0) {
                return -1;
            }
            return value;
        }
        return -1;
    }

    // sanitize QoS
    sanitizeQoS(value: number): number {
        if (value !== undefined && !Number.isNaN(value) && value > 0 && value < 4) {
            return value;
        }
        return 0;
    }

    // sanitize yes/no options
    sanizeYesNo(value: string): string {
        if (value !== undefined && value !== "") {
            if (value.toLowerCase() === "yes") {
                return "yes";
            }
            if (value.toLowerCase() === "no") {
                return "no";
            }
        }
        return "no";
    }

    // sanitize threshold value
    sanitizeThresholdValue(value: number): number {
        if (!Number.isNaN(value) && value > 0 && value <= 1.0) {
            return value;
        }
        return DEFAULT_THRESHOLD_VALUE;
    }

    // sanitize threshold criteria
    sanitizeThresholdCriteria(value: string): string {
        if (value !== undefined && value !== "" &&
           (value === "gt" ||
            value === "ge" ||
            value === "eq" ||
            value === "le" ||
            value === "lt")) {
            return value;
        }
        return DEFAULT_THRESHOLD_CRITERIA;
    }

    // initialize the optional threshold confidence filter
    initThresholdFilter() {
        const opts = {
            default_threshold: this.sanitizeThresholdValue(Number(<string>process.env.EI_DEFAULT_THRESHOLD)),
            threshold_criteria: this.sanitizeThresholdCriteria(<string>process.env.EI_THRESHOLD_CRITERIA),
        };
        this._thresholdFilter = new ThresholdFilter(opts);
    }

    // initialize the model info object instance
    initModelInfo(modelName: string, modelVersion: string, modelParams: any) {
        const opts = {
            model_name: modelName,
            model_version: modelVersion,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            model_params: modelParams,
        };
        this._modelInfo = new ModelInfo(opts);
    }

    // initialize the metrics collector
    initMetricsCollector() {
        this._metricsCollector = new MetricsCollector();
    }

    // command identifiers
    isRestartCommand(command: string): boolean {
        return (command === "restart");
    }
    isEnableThresholdFilterCommand(command: string): boolean {
        return (command === "enable_threshold_filter");
    }
    isDisableThresholdFilterCommand(command: string): boolean {
        return (command === "disable_threshold_filter");
    }
    isSetThresholdFilterCriteriaCommand(command: string): boolean {
        return (command === "set_threshold_filter_criteria");
    }
    isGetThresholdFilterCriteriaCommand(command: string): boolean {
        return (command === "get_threshold_filter_criteria");
    }
    isGetThresholdFilterConfidenceCommand(command: string): boolean {
        return (command === "get_threshold_filter_confidence");
    }
    isSetThresholdFilterConfidenceCommand(command: string): boolean {
        return (command === "set_threshold_filter_confidence");
    }
    isGetThresholdFilterConfigCommand(command: string): boolean {
        return (command === "get_threshold_filter_config");
    }
    isGetModelInfoCommand(command: string): boolean {
        return (command === "get_model_info");
    }
    isClearCatchCommand(command: string): boolean {
        return (command === "clear_cache");
    }
    isClearFileInCacheCommand(command: string): boolean {
        return (command === "clear_cache_file");
    }
    isResetMetricsCommand(command: string): boolean {
        return (command === "reset_metrics");
    }

    // IoTCore topic creation
    createTopics() {
        // Inference result topic
        this._inferenceOutputTopic = (<string>process.env.EI_INFERENCE_OUTPUT_TOPIC);

        // Model metrics status topic
        this._metricsOutputTopic = (<string>process.env.EI_METRICS_OUTPUT_TOPIC);

        // Command/control topics
        this._commandInputTopic = (<string>process.env.EI_COMMAND_INPUT_TOPIC);
        this._commandOutputTopic = (<string>process.env.EI_COMMAND_OUTPUT_TOPIC);
    }

    // initialize the S3 processor
    async s3Init() {
        if (this._enableWriteToS3 === "yes") {
            try {
                this._s3Client = await new S3Client(this._clientConfig);
            }
            catch (err) {
                // unable to allocate
                if (this._notSilent) {
                    // not connected.. so connect to IoTCore
                    console.log(PREFIX + " EI: ERROR - Unable to allocate S3Client with exception: " + err);
                }
            }
        }
    }

    // connect to AWS IoTCore
    async connect() {
        if (this._iot === undefined) {
            if (this._notSilent) {
                // not connected.. so connect to IoTCore
                console.log(PREFIX + " EI: Connecting to IoTCore...");
            }

            try {
                // create topics
                this.createTopics();

                // allocate...
                this._iot = await new IoTDataPlaneClient(this._clientConfig);

                // we are connected!
                this._connected = true;

                // manage S3 connection as well
                await this.s3Init();

                // send startup status/timestamp
                await this.sendCommandResult({ "status":"started", "ts":Date.now(), "id":uuidv4() });
            }
            catch (err) {
                // unable to allocate
                if (this._notSilent) {
                    // not connected.. so connect to IoTCore
                    console.log(PREFIX + " EI: ERROR - Unable to allocate IoTDataPlaneClient with exception: " + err);
                }
                this._iot = undefined;
                this._connected = false;
            }
        }
        else {
            // already connected... OK
            this._connected = true;
        }
        return this.isConnected();
    }

    isConnected(): boolean {
        return this._connected;
    }

    // is the inference result empty?
    isEmptyInference(payload: Payload, key: AwsResultKey): boolean {
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

    // launch all async tasks
    async launchAsyncTasks() {
        // launch the metrics dispatcher
        console.log(PREFIX + " Launching metrics collector...");
        // eslint-disable-next-line  @typescript-eslint/no-floating-promises
        this.dispatchMetricsCollector(this._metricsOutputTopic, this._metricsDispatchSleepTimeMS);

        // launch the command receiver
        console.log(PREFIX + " Launching command receiver...");
        // eslint-disable-next-line  @typescript-eslint/no-floating-promises
        this.dispatchCommandListener(this._commandInputTopic, this._poolSleepTimeMS);

        // XXX add more async tasks here...
    }

    // clear retained queue in IoTCore
    async clearRetainedQueue(cmd_topic: string) {
        try {
            if (this._iot !== undefined) {
                // publish... do not proceed until this message has been cleared...
                await this._iot.send(new PublishCommand({
                    topic: cmd_topic,
                    retain: true
                }));
            }
        }
        catch (err) {
            // ignore
        }
    }

    // restart the runner handler
    processRestartCommand() {
        // announce
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.log(PREFIX + " processRestartCommand(): Restarting Runner: " + this._opts.appName + "...");

        // send ourselves a single to gracefully shutdown...
        process.kill(process.pid, "SIGINT");
    }

    // metrics collector process
    async dispatchMetricsCollector(metricsOutputTopic: string, sleepMS: number) {
        while (this.isConnected() === true) {
            try {
                if (this._iot !== undefined && this._metricsCollector !== undefined) {
                    // publish the current metrics
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    // eslint-disable-next-line  @typescript-eslint/no-floating-promises
                    this.sendModelMetrics(this._metricsCollector.json());
                }
            }
            catch (err) {
                // ignore
            }

            // Sleep
            await new Promise(resolve => setTimeout(resolve, sleepMS));
        }

        // WARN
        console.log(PREFIX + " dispatchMetricsCollector() WARNING: process loop has halted...");
    }

    // reset metrics collection
    resetMetrics() : object {
        if (this._metricsCollector !== undefined) {
            return this._metricsCollector.reset();
        }
        return {"metrics_reset": "OK"};
    }

    // command listener/processor process
    async dispatchCommandListener(commandInputTopic: string, longPollSleepMS: number) {
        while (this.isConnected() === true) {
            // Long Poll via GetRetainedMessageCommand()...
            try {
                if (this._iot !== undefined) {
                    const response = await this._iot.send(
                        new GetRetainedMessageCommand({ topic: commandInputTopic }));
                    if (response !== undefined) {
                        // Retrieve the command
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const rcvdCmd = JSON.parse(new TextDecoder().decode(response.payload));

                        // Clear Retained Messages
                        await this.clearRetainedQueue(commandInputTopic);

                        // ensure we have a received command...
                        if (rcvdCmd !== undefined) {
                            // COMMAND: restart the runner
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            if (this.isRestartCommand(<string>(rcvdCmd.cmd)) === true) {
                                // send confirmation
                                console.log(PREFIX + " dispatchCommandListener(): restarting runner process...");
                                await this.sendCommandResult({ "restart": "OK" });

                                // process the restart command...
                                this.processRestartCommand();
                            }

                            // COMMAND: get the threshold filter confidence threshold value
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isGetThresholdFilterConfidenceCommand(<string>(rcvdCmd.cmd)) === true &&
                                     this._thresholdFilter !== undefined) {
                                // send the confidence threshold
                                console.log(PREFIX + " dispatchCommandListener(): getting threshold filter confidence setting...");
                                await this.sendCommandResult({ "confidence_threshold": this._thresholdFilter.getConfidenceThreshold() });
                            }

                            // COMMAND: set the threshold filter criteria value
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isSetThresholdFilterConfidenceCommand(<string>(rcvdCmd.cmd)) === true &&
                                     this._thresholdFilter !== undefined) {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                if (this._thresholdFilter.confidenceThresholdValueInBounds(<number>rcvdCmd.value)) {
                                    // set the confidence threshold
                                    console.log(PREFIX +
                                        " dispatchCommandListener(): Setting threshold filter confidence threshold to:  " +
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                        <number>rcvdCmd.value);
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                    this._thresholdFilter.setConfidenceThreshold(<number>rcvdCmd.value);
                                }
                                else {
                                    // confidence threshold must be 0 < x <= 1.0
                                    console.log(PREFIX +
                                        " dispatchCommandListener(): Unable to set threshold filter confidence threshold to:  " +
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                        <number>rcvdCmd.value + "... Threshold value must be 0 < x < 1.0. No changes made.");
                                }

                                // send the command result
                                await this.sendCommandResult({ "confidence_threshold": this._thresholdFilter.getConfidenceThreshold() });
                            }

                            // COMMAND: get the threshold filter criteria value
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isGetThresholdFilterCriteriaCommand(<string>(rcvdCmd.cmd)) === true &&
                                     this._thresholdFilter !== undefined) {
                                // ssend the command result
                                console.log(PREFIX + " dispatchCommandListener(): getting threshold criteria setting...");
                                await this.sendCommandResult({ "criteria": this._thresholdFilter.getConfidenceCriteria() });
                            }

                            // COMMAND: set the threshold filter criteria value
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isSetThresholdFilterCriteriaCommand(<string>(rcvdCmd.cmd)) === true &&
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                this._thresholdFilter !== undefined && rcvdCmd.value !== undefined) {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                if (this._thresholdFilter.validCriteria(<string>rcvdCmd.value) === true) {
                                    // set the confidence criteria
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                    console.log(PREFIX + " dispatchCommandListener(): Setting threshold criteria to:  " + <string>rcvdCmd.value);
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                    this._thresholdFilter.setConfidenceCriteria(<string>rcvdCmd.value);

                                    // send the confidence criteria
                                    await this.sendCommandResult({ "criteria": this._thresholdFilter.getConfidenceCriteria() });
                                }
                                else {
                                    // log the error
                                    console.log(PREFIX + " dispatchCommandListener(): Unable to set threshold criteria to:  " +
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                        <string>rcvdCmd.value + " (not recognized). Sending current critiera");

                                    // send the confidence criteria
                                    await this.sendCommandResult({ "criteria": this._thresholdFilter.getConfidenceCriteria() });
                                }
                            }

                            // COMMAND: enable threshold filter
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isEnableThresholdFilterCommand(<string>(rcvdCmd.cmd)) === true &&
                                     this._thresholdFilter !== undefined) {
                                // display the new config
                                console.log(PREFIX + " dispatchCommandListener(): enabling threshold filter...");
                                this._thresholdFilter.enable();
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                await this.sendCommandResult({ "threshold_filter_config": this._thresholdFilter.json() });
                            }

                            // COMMAND: disable threshold filter
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isDisableThresholdFilterCommand(<string>(rcvdCmd.cmd)) === true &&
                                     this._thresholdFilter !== undefined) {
                                // display the new config
                                console.log(PREFIX + " dispatchCommandListener(): disabling threshold filter...");
                                this._thresholdFilter.disable();
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                await this.sendCommandResult({ "threshold_filter_config": this._thresholdFilter.json() });
                            }

                            // COMMAND: get the threshold filter config info
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isGetThresholdFilterConfigCommand(<string>(rcvdCmd.cmd)) === true &&
                                    this._thresholdFilter !== undefined) {
                                // get model info
                                console.log(PREFIX + " dispatchCommandListener(): getting current threshold filter config...");
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                await this.sendCommandResult({ "threshold_filter_config": this._thresholdFilter.json() });
                            }

                            // COMMAND: get the model info
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isGetModelInfoCommand(<string>(rcvdCmd.cmd)) === true &&
                                     this._modelInfo !== undefined) {
                                // get model info
                                console.log(PREFIX + " dispatchCommandListener(): getting current model information...");
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                await this.sendCommandResult({ "model_info": this._modelInfo.json() });
                            }

                            // COMMAND: clear the cache
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isClearCatchCommand(<string>(rcvdCmd.cmd)) === true &&
                                    this._modelInfo !== undefined) {
                                // set the confidence threshold
                                console.log(PREFIX + " dispatchCommandListener(): Clearing inference file/json cache...");
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                const result = await this.cacheClear();

                                // send the command result
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                await this.sendCommandResult({ "clear_cache": result });
                            }

                            // COMMAND: clear specified file within the cache
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isClearFileInCacheCommand(<string>(rcvdCmd.cmd)) === true &&
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                this._modelInfo !== undefined && rcvdCmd.value !== undefined) {
                                // set the confidence threshold
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                console.log(PREFIX +
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                    " dispatchCommandListener(): Clearing inference file/json from cache. UUID: " + <string>(rcvdCmd.value));
                                // eslint-disable-next-line @stylistic/max-len
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                                const result = await this.cacheClearInferenceAndImageByUUID(<string>(rcvdCmd.value));

                                // send the command result
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                await this.sendCommandResult({ "clear_cache_file": result });
                            }

                            // COMMAND: reset the metrics counters
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            else if (this.isResetMetricsCommand(<string>(rcvdCmd.cmd)) === true &&
                                     this._metricsCollector !== undefined) {
                                // set the confidence threshold
                                console.log(PREFIX + " dispatchCommandListener(): Resetting metrics collection...");
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                const result = await this.resetMetrics();

                                // send the command result
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                await this.sendCommandResult(result);
                            }

                            // XXX COMMAND: more commands supported here over time...

                            // COMMAND: default case - unrecognized command...ignore.
                            else {
                                // command not supported/understood... so ignore
                                if (this._notSilent === true) {
                                    console.log(PREFIX + " dispatchCommandListener() Command: " + JSON.stringify(rcvdCmd) +
                                        " not supported/understood. Ignoring...");
                                }
                            }
                        }
                        else {
                            // empty/null command... just ignore
                            if (this._notSilent === true) {
                                console.log(PREFIX + " dispatchCommandListener() Command is empty/null. Ignoring...");
                            }
                        }
                    }
                }
                else {
                    if (this._notSilent === true) {
                        // Connected but null command object
                        console.log(PREFIX + " dispatchCommandListener(): WARNING Status states connected() but iotcore handle is NULL!");
                    }
                }
            }
            catch (err) {
                // ignore
            }

            // Sleep
            await new Promise(resolve => setTimeout(resolve, longPollSleepMS));
        }
    }

    // send a command's results
    async sendCommandResult(payload: any) {
        if (this._iot !== undefined && this.isConnected() === true &&
            this._commandOutputTopic !== undefined && this._commandOutputTopic.length > 0) {
            // build the command result
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const result = { "result": payload };

            // publish!
            try {
                // send the command result
                await this._iot.send(new PublishCommand({
                    topic: this._commandOutputTopic,
                    qos: this._iotcoreQoS,
                    retain: false,
                    payload: Buffer.from(JSON.stringify(result))
                }));
            }
            catch (err) {
                if (this._notSilent === true) {
                    // exception during send()...
                    console.log(PREFIX + " sendCommandResult() ERROR: IoTDataPlaneClient.send() errored with exception: " + err);
                }
            }
        }
        else if (this._iot !== undefined && this.isConnected() === true) {
            // no command result topic
            if (this._notSilent) {
                console.log(PREFIX + " sendCommandResult() ERROR: No command output topic specified in configuration... not sending result.");
            }
        }
        else {
            // not connected
            if (this._notSilent) {
                console.log(PREFIX + " sendCommandResult() ERROR: Not connected to IoTCore... not sending command result.");
            }
        }
    }

    // update confidence metrics
    updateInferenceMetrics(confidences: any) {
        if (this._metricsCollector !== undefined) {
            this._metricsCollector.updateConfidenceMetrics(confidences);
        }
    }

    // publish our model metrics
    async sendModelMetrics(payload: any) {
        if (this._iot !== undefined && this.isConnected() === true &&
            this._metricsOutputTopic !== undefined && this._metricsOutputTopic.length > 0) {
            // publish!
            try {
                // send the publication
                await this._iot.send(new PublishCommand({
                    topic: this._metricsOutputTopic,
                    qos: this._iotcoreQoS,
                    retain: false,
                    payload: Buffer.from(JSON.stringify(payload))
                }));
            }
            catch (err) {
                if (this._notSilent === true) {
                    // exception during send()...
                    console.log(PREFIX + " sendModelMetrics() ERROR: IoTDataPlaneClient.send() errored with exception: " + err);
                }
            }
        }
        else if (this._iot !== undefined && this.isConnected() === true) {
            // no model metrics topic
            if (this._notSilent) {
                console.log(PREFIX + " sendModelMetrics() ERROR: No model metrics topic specified in configuration... not sending model metrics.");
            }
        }
        else {
            // not connected
            if (this._notSilent) {
                console.log(PREFIX + " sendModelMetrics() ERROR: Not connected to IoTCore... not sending model metrics.");
            }
        }
    }

    // OPTION: cache inference image and inference json to local directory on edge device...
    async saveToFile(payload: Payload, imgAsJpg: Buffer): Promise<string> {
        // construct the filename...
        const filenameBase = this._writeToFileDir + "/" + payload.id;
        const imageFilename = filenameBase + ".img";
        const infFilename = filenameBase + ".json";
        let result = "OK";

        // INFERENCE: write out to disk...
        fs.writeFile(infFilename, JSON.stringify(payload), function (writeErr) {
            if (writeErr) {
                console.log(PREFIX + " saveToFile(): Error in writing out file: " + infFilename + " Error: " + writeErr);
                result = "FAILED";
            }
        });

        // IMAGE: write out to disk...
        fs.writeFile(imageFilename, imgAsJpg, function (writeErr) {
            if (writeErr) {
                console.log(PREFIX + " saveToFile(): Error in writing out file: " + imageFilename + " Error: " + writeErr);
                result = "FAILED";
            }
        });
        return result;
    }

    // create the prefix used to store the inference/image into the S3 bucket
    createS3Prefix() : string {
        return this._modelInfo?.getModelName() + "_" + this._modelInfo?.getModelVersion() + "/";
    }

    // OPTION: cache inference image and inference json to S3 bucket
    async saveToS3(payload: Payload, imgAsJpg: Buffer): Promise<string> {
        // construct the filenames...
        const basePath = this.createS3Prefix();
        const imageFilename = basePath + payload.id + ".img";
        const infFilename = basePath + payload.id + ".json";
        let result = "OK";

        // Create the S3 bucket if it doesn't exist.
        if (this._s3Client !== undefined) {
            try {
                await this._s3Client.send(
                    new CreateBucketCommand({ Bucket: this._s3Bucket })
                );
            }
            catch (err) {
                if (this._notSilent) {
                    // exception during send()...
                    console.log(PREFIX + " saveToS3() ERROR: s3_client.send(CreateBucket) errored with exception: " + err);
                    result = "FAILED";
                }
            }

            // Upload the image file to S3.
            try {
                await this._s3Client.send(new PutObjectCommand({
                    Bucket: this._s3Bucket,
                    Key: imageFilename,
                    Body: imgAsJpg,
                }));
            }
            catch (err) {
                if (this._notSilent) {
                    // exception during send()...
                    console.log(PREFIX + " saveToS3() ERROR: s3_client.send(PutObjectImageFile) errored with exception: " + err);
                    result = "FAILED";
                }
            }

            // Upload the inference file to S3.
            try {
                await this._s3Client.send(new PutObjectCommand({
                    Bucket: this._s3Bucket,
                    Key: infFilename,
                    Body: JSON.stringify(payload),
                }));
            }
            catch (err) {
                if (this._notSilent) {
                    // exception during send()...
                    console.log(PREFIX + " saveToS3() ERROR: s3_client.send(PutObjectInferenceFile) errored with exception: " + err);
                    result = "FAILED";
                }
            }
        }
        return result;
    }

    // process option to delete cache file (local) identified by its uuid
    async localFileCacheClearFileByUUID(uuid: string): Promise<string> {
        // construct the filenames...
        const filenameBase = this._writeToFileDir + "/" + uuid;
        const imageFilename = filenameBase + ".img";
        const infFilename = filenameBase + ".json";
        let result = "OK";

        // delete the files
        if (fs.existsSync(imageFilename)) {
            try {
                await fs.unlinkSync(imageFilename);
            }
            catch (err) {
                console.log(PREFIX + " localFileCacheClearFileByUUID(): unable to remove file: " + imageFilename + " Exception: " + err);
                result = "FAILED";
            }
        }
        else {
            // file does not exist
            console.log(PREFIX + "localFileCacheClearFileByUUID(): unable to remove file: " + imageFilename + " does not exist");
            result = "FAILED";
        }

        if (fs.existsSync(infFilename)) {
            try {
                await fs.unlinkSync(infFilename);
            }
            catch (err) {
                console.log(PREFIX + " localFileCacheClearFileByUUID(): unable to remove file: " + infFilename + " Exception: " + err);
                result = "FAILED";
            }
        }
        else {
            // file does not exist
            console.log(PREFIX + "localFileCacheClearFileByUUID(): unable to remove file: " + infFilename + " does not exist");
            result = "FAILED";
        }
        return result;
    }

    // process option to delete cache file (s3) identified by its uuid
    async s3CacheClearByUUID(uuid: string): Promise<string> {
        let result = "OK";
        let found = false;
        const basePath = this._modelInfo?.getModelName() + "_" + this._modelInfo?.getModelVersion() + "/";

        if (this._s3Client !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const bucketParams = { Bucket: this._s3Bucket, Prefix: basePath };
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const { Contents } = <any>(await this._s3Client.send(new ListObjectsV2Command(bucketParams)));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                for (let index = 0; index < Contents.length; index++) {
                    // eslint-disable-next-line @stylistic/max-len
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    if (Contents[index].Key.includes(uuid) === true) {
                        // found the file... delete it.
                        found = true;
                        // eslint-disable-next-line @stylistic/max-len
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                        const delCommand = { Bucket: this._s3Bucket, Key: Contents[index].Key };
                        console.log(PREFIX + " s3CacheClearByUUID(): Deleting: " + JSON.stringify(delCommand));
                        await this._s3Client.send(new DeleteObjectCommand(delCommand));
                    }
                }
            }
            catch (err) {
                console.log(PREFIX + " s3CacheClearByUUID(): caught exception while clearing file in S3 cache: " +
                    err + " Bucket: " + this._s3Bucket + " Base Path: " + basePath + " UUID: " + uuid);
                result = "FAILED";
            }

            // make sure we found something
            if (!found) {
                console.log(PREFIX + " s3CacheClearByUUID(): Unable to delete file with UUID: " + uuid + " No matching files found in: " + this._s3Bucket + "/" + basePath);
                result = "FAILED";
            }
        }
        return result;
    }

    // clear the local directory/file cache
    async localFileCacheClear(): Promise<string> {
        let result = "OK";
        try {
            const files = await fs.readdirSync(this._writeToFileDir);
            for (const file of files) {
                const filePath = path.join(this._writeToFileDir, file);
                if (fs.existsSync(filePath)) {
                    try {
                        await fs.unlinkSync(filePath);
                    }
                    catch (err) {
                        console.log(PREFIX + " localFileCacheClear(): unable to remove file: " + filePath + " Exception: " + err);
                        result = "FAILED";
                    }
                }
            }
        }
        catch (err) {
            console.log(PREFIX + " localFileCacheClear(): exception caught while clearing local file cache: " + err + " Directory: " + this._writeToFileDir);
            result = "FAILED";
        }
        return result;
    }

    // clear the S3 cache
    async s3CacheClear(): Promise<string> {
        // construct the filenames...
        const basePath = this._modelInfo?.getModelName() + "_" + this._modelInfo?.getModelVersion() + "/";

        // Create the S3 bucket if it doesn't exist.
        if (this._s3Client !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const bucketParams = { Bucket: this._s3Bucket, Prefix: basePath };
            try {
                const listCommand = new ListObjectsV2Command(bucketParams);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const { Contents } = <any>(await this._s3Client.send(listCommand));
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                for (let index = 0; index < Contents.length; index++) {
                    // eslint-disable-next-line @stylistic/max-len
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                    const delCommand = { Bucket: this._s3Bucket, Key: Contents[index].Key };
                    await this._s3Client.send(new DeleteObjectCommand(delCommand));
                }
            }
            catch (err) {
                console.log(PREFIX + " s3CacheClear(): caught exception while clearing S3 cache: " +
                    err + " Bucket: " + this._s3Bucket + " Base Path: " + basePath);
                return "FAILED";
            }
        }
        return "OK";
    }

    // process option to cache inference image and inference json...
    async cacheInferenceImageAndJSON(payload: Payload, imgAsJpg: Buffer): Promise<any> {
        let result = { "local": "OK", "s3": "OK", "uuid": payload.id };

        // cache to local directory/file (optional)
        if (this._enableWriteToFile !== undefined && this._enableWriteToFile === "yes" && imgAsJpg !== undefined) {
            result.local = await this.saveToFile(payload, imgAsJpg);
        }

        // cache to S3 (optional)
        if (this._enableWriteToS3 !== undefined && this._enableWriteToS3 === "yes" && imgAsJpg !== undefined) {
            result.s3 = await this.saveToS3(payload, imgAsJpg);
        }
        return result;
    }

    // process option to delete inference image + json from cache via its uuid...
    async cacheClearInferenceAndImageByUUID(uuid: string): Promise<any> {
        let result = { "local": "OK", "s3": "OK", "uuid": uuid };

        // clear local directory/file cache
        if (this._enableWriteToFile !== undefined && this._enableWriteToFile === "yes") {
            console.log(PREFIX + " cacheClearInferenceAndImageByUUID(): Clearing file(s) locally cached prefixed by UUID: " + uuid);
            result.local = await this.localFileCacheClearFileByUUID(uuid);
        }

        // clear the S3 cache
        if (this._enableWriteToS3 !== undefined && this._enableWriteToS3 === "yes") {
            console.log(PREFIX + " cacheClearInferenceAndImageByUUID(): Clearing file(s) in S3 prefixed by UUID: " + uuid);
            result.s3 = await this.s3CacheClearByUUID(uuid);
        }
        return result;
    }

    // process command to clear the inference image and inference json cache...
    async cacheClear(): Promise<any> {
        let result = { "local": "OK", "s3": "OK" };

        // clear local directory/file cache
        if (this._enableWriteToFile !== undefined && this._enableWriteToFile === "yes") {
            console.log(PREFIX + " cacheClear(): Clearing local file cache...");
            result.local = await this.localFileCacheClear();
        }

        // clear the S3 cache
        if (this._enableWriteToS3 !== undefined && this._enableWriteToS3 === "yes") {
            console.log(PREFIX + " cacheClear(): Clearing S3 cache...");
            result.s3 = await this.s3CacheClear();
        }
        return result;
    }

    // send inference to IoTCore (optionally add Base64 encoded inference image if not too big...)
    async sendInference(meanConfidence: number, payload: Payload, key: AwsResultKey, imgAsJpg?: Buffer) {
        if (this._iot !== undefined && this.isConnected() === true &&
            this._inferenceOutputTopic !== undefined && this._inferenceOutputTopic.length > 0) {
            if (this.isEmptyInference(payload, key)) {
                // empty inference ... so save money and don't publish
            }
            else {
                // add the s3 bucket info if enabled
                payload.s3_bucket = "unset";
                payload.s3_prefix = "unset";
                if (this._enableWriteToS3 !== undefined &&
                    this._enableWriteToS3 === "yes" && this._s3Bucket !== undefined) {
                    payload.s3_bucket = this._s3Bucket;
                    payload.s3_prefix = this.createS3Prefix();
                }

                // set the payload
                const data = Buffer.from(JSON.stringify(payload));

                // default publish check
                let doPublish = true;

                // check if we are using confidence threshold to control publication
                if (this._thresholdFilter !== undefined && this._thresholdFilter.enabled() === true) {
                    doPublish = (this._thresholdFilter.meetsThresholdCriteria(meanConfidence));
                }

                // Check if the data length exceeds the max payload allowed by IoTCore...
                if (data.length >= IOTCORE_MAX_PAYLOAD) {
                    console.log(PREFIX + " sendInference() WARNING: IoTCore message length "
                        + data.length + " bytes is larger than the maximum allowed payload size of "
                        + IOTCORE_MAX_PAYLOAD + " bytes!  Message may not be published.");
                }

                // process the inference send...
                if (this._delayInferences > 0) {
                    ++this._delayCountdown;
                    if (this._delayCountdown >= this._delayInferences) {
                        // reset:
                        this._delayCountdown = 0;

                        // publish if directed to...
                        if (doPublish === true) {
                            // publish!
                            try {
                                // send the publication
                                await this._iot.send(new PublishCommand({
                                    topic: this._inferenceOutputTopic,
                                    qos: this._iotcoreQoS,
                                    payload: data
                                }));

                                // cache the inference image as configured
                                if (imgAsJpg !== undefined) {
                                    await this.cacheInferenceImageAndJSON(payload, imgAsJpg);
                                }
                            }
                            catch (err) {
                                if (this._notSilent) {
                                    // exception during send()...
                                    console.log(PREFIX + " sendInference() ERROR: IoTDataPlaneClient.send() exception: " + err);
                                }
                            }
                        }
                    }
                }
                else {
                    // publish if directed to...
                    if (doPublish === true) {
                        // publish!
                        try {
                            // send the publication
                            await this._iot.send(new PublishCommand({
                                topic: this._inferenceOutputTopic,
                                qos: this._iotcoreQoS,
                                payload: data
                            }));

                            // publish the inference image as configured
                            if (imgAsJpg !== undefined) {
                                await this.cacheInferenceImageAndJSON(payload, imgAsJpg);
                            }
                        }
                        catch (err) {
                            if (this._notSilent) {
                                // exception during send()...
                                console.log(PREFIX + " ERROR: IoTDataPlaneClient.send() exception: " + err);
                            }
                        }
                    }
                }
            }
        }
        else if (this._iot !== undefined && this.isConnected() === true) {
            // no publication topic
            if (this._notSilent) {
                console.log(PREFIX + " ERROR: No model inference publication topic specified in configuration... not sending inference results.");
            }
        }
        else {
            // not connected
            if (this._notSilent) {
                console.log(PREFIX + " ERROR: Not connected to IoTCore... not sending inference.");
            }
        }
    }
}