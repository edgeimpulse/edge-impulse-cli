// Generated from device-services-contracts/schema/ by device-services-contracts/generate.sh. Do not edit.

/**
 * Messages exchanged during a Remote Management V4 session. `DeviceToServer`
 * includes the Hello V4 handshake and device responses and events;
 * `ServerToDevice` includes the handshake response and server requests and
 * commands. Hello V1 to V3 are defined in `remote-management-legacy.json`.
 */
export type RemoteManagementMessage = DeviceToServer | ServerToDevice;
/**
 * Device-to-server messages of a Hello V4 session, including the existing
 * Remote Management protocol and the agent's additive messages.
 */
export type DeviceToServer =
    | HelloV4
    | SampleResponse
    | SampleStartedResponse
    | SampleReadingResponse
    | SampleUploadingResponse
    | SampleProcessingResponse
    | SampleFinishedResponse
    | SnapshotStreamStartedResponse
    | SnapshotStreamStoppedResponse
    | SnapshotStreamFailedResponse
    | SnapshotResponse
    | InferenceStreamStartedResponse
    | InferenceStreamStoppedResponse
    | InferenceStreamFailedResponse
    | InferenceStarted
    | InferenceSummary
    | ImpulseRecord
    | ImpulseRecordsResponse
    | NewModelUpdated
    | Telemetry;
/**
 * The device's identity, sensors and mode.
 */
export type HelloV4Body = HelloIngestion | HelloInference;
/**
 * Sampling only. No summaries, records or model updates.
 */
export type HelloIngestion = HelloV4Common & {
    /**
     * Always `ingestion`.
     */
    mode: 'ingestion';
};
/**
 * How the device reaches Remote Management; the agent sends `ip`.
 */
export type ClientConnectionType = 'ip' | 'daemon';
/**
 * The Hello version, always `4`.
 */
export type HelloVersion = 4;
/**
 * Model Monitoring: summaries, records on request and model updates.
 */
export type HelloInference = HelloV4Common & {
    availableRecords: AvailableRecords;
    inferenceInfo: InferenceInfo;
    /**
     * Always `inference`.
     */
    mode: 'inference';
};
/**
 * What the model produces.
 */
export type ModelType = 'classification' | 'object_detection' | 'constrained_object_detection' | 'freeform';
/**
 * How the input image was resized, for image models.
 */
export type ResizeMode = 'none' | 'fit-shortest' | 'fit-longest' | 'squash';
/**
 * The file's format.
 */
export type RawDataType = 'wav' | 'jpg';
/**
 * Device to server. The outcome of a model update, whichever message or
 * policy started it.
 */
export type NewModelUpdated = ModelUpdateSuccess | ModelUpdateFailure;
/**
 * New, optional. Which operation finished. The agent always sends it.
 */
export type UpdateOperation = 'deploy' | 'rollback';
/**
 * New, optional. Which operation failed.
 */
export type UpdateOperation1 = 'deploy' | 'rollback';
/**
 * Whether it was a deploy or a rollback.
 */
export type UpdateOperation2 = 'deploy' | 'rollback';
/**
 * Where the workload is in its life.
 */
export type WorkloadState = 'starting' | 'running' | 'unhealthy' | 'stopped';
/**
 * Server-to-device messages of a Hello V4 session, including the existing
 * Remote Management protocol and the agent's additive commands.
 */
export type ServerToDevice =
    | HelloResponse
    | SampleRequest
    | StartSnapshotStreamRequest
    | StopSnapshotStreamRequest
    | StartInferenceStreamRequest
    | StopInferenceStreamRequest
    | ImpulseRecordAck
    | ImpulseRecordsRequest
    | NewModelAvailable
    | DeployModel
    | RollbackModel;
/**
 * Server to device. The answer to Hello: accepted with the server's clock, or refused with a reason.
 * The two differ by a required field each (`serverTimestamp`, `err`), so a valid answer always parses
 * as the right one.
 */
export type HelloResponse = HelloAccepted | HelloRejected;
/**
 * The version to consider.
 */
export type DeploymentVersionOrLatest = number | Latest;
/**
 * The string `latest`.
 */
export type Latest = 'latest';

/**
 * Device to server. The first message of a session.
 */
export interface HelloV4 {
    hello: HelloV4Body;
}
/**
 * The fields every variant of `HelloV4Body` shares.
 */
export interface HelloV4Common {
    /**
     * The project's API key. From DA9 a device credential replaces it.
     */
    apiKey: string;
    /**
     * An OAuth bearer, once device credentials exist. Unused by the demo.
     */
    authorization?: string;
    connection: ClientConnectionType;
    /**
     * The agent's device ID: `device_id` from its configuration, or the
     * lowercase hexadecimal UUID it created on first start.
     */
    deviceId: string;
    /**
     * The board or host type, shown in Studio's device list.
     */
    deviceType: string;
    /**
     * The sensors of this project's workloads, for sampling from Studio.
     */
    sensors: Sensor[];
    /**
     * Whether the device streams camera snapshots to Studio. The agent sends false.
     */
    supportsSnapshotStreaming: boolean;
    version: HelloVersion;
}
/**
 * A sensor a device offers for sampling, as Hello declares it. Remote
 * Management requires at least one frequency unless the name starts with
 * `Camera` or `Video`.
 */
export interface Sensor {
    /**
     * Supported sampling frequencies, in hertz. Empty for a camera.
     */
    frequencies: number[];
    /**
     * The longest sample this sensor can take, in seconds.
     */
    maxSampleLengthS: number;
    /**
     * `Camera (WxH)` or `Microphone` in the demo, as Studio validates them.
     */
    name: string;
}
/**
 * The range of records the device can serve on request.
 */
export interface AvailableRecords {
    /**
     * The oldest record's index.
     */
    firstIndex: number;
    /**
     * When the oldest record was made.
     */
    firstTimestamp: number;
    /**
     * The newest record's index.
     */
    lastIndex: number;
    /**
     * When the newest record was made.
     */
    lastTimestamp: number;
}
/**
 * The project and impulse the device serves in this session.
 */
export interface InferenceInfo {
    /**
     * The deployment version the device runs.
     */
    deploymentVersion: number;
    modelType: ModelType;
    /**
     * The Studio project of the impulse.
     */
    projectId: number;
    /**
     * The project's name.
     */
    projectName: string;
    /**
     * The project owner's name, as Studio shows it.
     */
    projectOwner: string;
}
/**
 * Device to server. Acknowledges a sampling request or reports a sampling
 * failure. The existing protocol keeps `error` optional even on failure.
 */
export interface SampleResponse {
    /**
     * Whether the sampling request was accepted; false reports a failure.
     */
    sample: boolean;
    /**
     * Optional explanation of the sampling failure.
     */
    error?: string;
}
/**
 * Device to server. Reports that sampling has started.
 */
export interface SampleStartedResponse {
    /**
     * The sampling-started flag; retains the existing boolean type.
     */
    sampleStarted: boolean;
}
/**
 * Device to server. Reports progress while reading a sample.
 */
export interface SampleReadingResponse {
    /**
     * The sampling-reading flag; retains the existing boolean type.
     */
    sampleReading: boolean;
    /**
     * Sampling progress as a percentage, or -1 when unknown. Retains the
     * existing number type without imposing a 0-to-100 range.
     */
    progressPercentage: number;
}
/**
 * Device to server. Reports that the captured sample is being uploaded.
 */
export interface SampleUploadingResponse {
    /**
     * The sampling-uploading flag; retains the existing boolean type.
     */
    sampleUploading: boolean;
}
/**
 * Device to server. Reports that the captured sample is being processed.
 */
export interface SampleProcessingResponse {
    /**
     * The sampling-processing flag; retains the existing boolean type.
     */
    sampleProcessing: boolean;
}
/**
 * Device to server. Reports that sampling has finished.
 */
export interface SampleFinishedResponse {
    /**
     * The sampling-finished flag; retains the existing boolean type.
     */
    sampleFinished: boolean;
}
/**
 * Device to server. Reports that snapshot streaming has started.
 */
export interface SnapshotStreamStartedResponse {
    /**
     * The snapshot-stream started flag; retains the existing boolean type.
     */
    snapshotStarted: boolean;
}
/**
 * Device to server. Reports that snapshot streaming has stopped.
 */
export interface SnapshotStreamStoppedResponse {
    /**
     * The snapshot-stream stopped flag; retains the existing boolean type.
     */
    snapshotStopped: boolean;
}
/**
 * Device to server. Reports a snapshot-stream failure.
 */
export interface SnapshotStreamFailedResponse {
    /**
     * The snapshot-stream failure flag; retains the existing boolean type.
     */
    snapshotFailed: boolean;
    /**
     * Why snapshot streaming failed.
     */
    error: string;
}
/**
 * Device to server. One snapshot-stream frame.
 */
export interface SnapshotResponse {
    /**
     * The frame's base64-encoded image data.
     */
    snapshotFrame: string;
    /**
     * The image file name, including its extension.
     */
    fileName: string;
}
/**
 * Device to server. Answers a request to start inference streaming.
 */
export interface InferenceStreamStartedResponse {
    /**
     * Whether inference streaming started. Can be false when no monitor is available.
     */
    inferenceStreamStarted: boolean;
}
/**
 * Device to server. Answers a request to stop inference streaming.
 */
export interface InferenceStreamStoppedResponse {
    /**
     * Whether inference streaming stopped. Can be false when no monitor is available.
     */
    inferenceStreamStopped: boolean;
}
/**
 * Device to server. Reports an inference-stream failure.
 */
export interface InferenceStreamFailedResponse {
    /**
     * The inference-stream failure flag; retains the existing boolean type.
     */
    inferenceStreamFailed: boolean;
    /**
     * Why inference streaming failed.
     */
    error: string;
}
/**
 * Device to server. Reports inference startup, as in the existing
 * `MgmtInterfaceInferenceStarted` message.
 */
export interface InferenceStarted {
    /**
     * Whether inference has started.
     */
    inferenceStarted: boolean;
}
/**
 * Device to server. The summary of a window of inferences.
 */
export interface InferenceSummary {
    inferenceSummary: InferenceSummaryBody;
}
/**
 * The summary.
 */
export interface InferenceSummaryBody {
    /**
     * How many inferences each label won in the window.
     */
    classificationCounter: LabelValue[];
    end: RecordPosition;
    /**
     * Mean score per label over the window.
     */
    mean: LabelValue[];
    metrics: SummaryMetrics;
    /**
     * New, optional. The rules version that produced this summary. Absent
     * means the runner's original rules. The agent computes with rules v2
     * and sends `2` only when the server's `capabilities` include
     * `summaryRulesVersion`, because older Studio versions do not consume or
     * store the field. Studio support is tracked at
     * https://github.com/edgeimpulse/closed-loop-demo/issues/52.
     */
    rulesVersion?: number;
    /**
     * Standard deviation of the score per label over the window.
     */
    standardDeviation: LabelValue[];
    start: RecordPosition1;
}
/**
 * A label with a number attached: a counter, a mean or a deviation.
 */
export interface LabelValue {
    /**
     * The label.
     */
    label: string;
    /**
     * The number for that label.
     */
    value: number;
}
/**
 * The last record of the window.
 */
export interface RecordPosition {
    /**
     * The record's index in the device's never-restarting sequence.
     */
    index: number;
    /**
     * When the record was made.
     */
    timestamp: number;
}
/**
 * Timing and anomaly metrics over the window.
 */
export interface SummaryMetrics {
    avg_inference_time?: AverageInferenceTime;
    /**
     * Mean of the visual anomaly means over the window.
     */
    visual_anomaly_mean?: number;
}
/**
 * Average time per stage over the window.
 */
export interface AverageInferenceTime {
    /**
     * Average time in the anomaly block, when the impulse has one.
     */
    anomaly?: number;
    /**
     * Average time in the learn block.
     */
    classification: number;
    /**
     * Average time in the DSP blocks.
     */
    dsp: number;
}
/**
 * The first record of the window.
 */
export interface RecordPosition1 {
    /**
     * The record's index in the device's never-restarting sequence.
     */
    index: number;
    /**
     * When the record was made.
     */
    timestamp: number;
}
/**
 * Device to server. One live inference-stream record, distinct from
 * `impulseRecordsResponse` for records requested by index. The server replies
 * with `impulseRecordAck` carrying the same index.
 */
export interface ImpulseRecord {
    impulseRecord: StoredRecord;
    /**
     * When the record was made, in milliseconds since the epoch.
     */
    timestamp: number;
    /**
     * The record's index, echoed in the acknowledgement.
     */
    index: number;
    rawData: RawData;
}
/**
 * The inference result and timing, with the same shape as a stored record.
 */
export interface StoredRecord {
    result: InferenceResult;
    timing: InferenceTiming;
}
/**
 * The inference's result.
 */
export interface InferenceResult {
    /**
     * Score of a GMM or K-means anomaly block.
     */
    anomaly?: number;
    /**
     * Detections of an object detection model.
     */
    bounding_boxes?: BoundingBox[];
    /**
     * Score per label of a classification model.
     */
    classification?: {
        [k: string]: number;
    };
    /**
     * The raw output tensors of a freeform model, one row per output.
     */
    freeform?: number[][];
    /**
     * Detections with identities, from an object tracking block.
     */
    object_tracking?: TrackedObject[];
    resizeMode?: ResizeMode;
    resized?: Resized;
    /**
     * Cells of a visual anomaly model above its threshold.
     */
    visual_anomaly_grid?: BoundingBox[];
    /**
     * The highest anomaly score over the whole grid.
     */
    visual_anomaly_max?: number;
    /**
     * The mean anomaly score over the whole grid.
     */
    visual_anomaly_mean?: number;
}
/**
 * A detection, or one cell of a visual anomaly grid.
 */
export interface BoundingBox {
    /**
     * Height in pixels.
     */
    height: number;
    /**
     * The detected label.
     */
    label: string;
    /**
     * The score of the detection, or the anomaly score of the cell.
     */
    value: number;
    /**
     * Width in pixels.
     */
    width: number;
    /**
     * Left edge, in pixels of the model's input.
     */
    x: number;
    /**
     * Top edge, in pixels of the model's input.
     */
    y: number;
}
/**
 * A detection with the identity an object tracking block assigned to it.
 */
export interface TrackedObject {
    /**
     * Height in pixels.
     */
    height: number;
    /**
     * The detected label.
     */
    label: string;
    /**
     * Stable across frames while the tracker follows the object.
     */
    object_id: number;
    /**
     * The score of the detection.
     */
    value: number;
    /**
     * Width in pixels.
     */
    width: number;
    /**
     * Left edge, in pixels of the model's input.
     */
    x: number;
    /**
     * Top edge, in pixels of the model's input.
     */
    y: number;
}
/**
 * The input image's size before and after resizing.
 */
export interface Resized {
    /**
     * Height after resizing.
     */
    newHeight: number;
    /**
     * Width after resizing.
     */
    newWidth: number;
    /**
     * Height of the captured image.
     */
    originalHeight: number;
    /**
     * Width of the captured image.
     */
    originalWidth: number;
}
/**
 * The inference's timing.
 */
export interface InferenceTiming {
    /**
     * Zero when the model has no anomaly block.
     */
    anomaly: number;
    /**
     * Time in the learn block.
     */
    classification: number;
    /**
     * Time in the DSP blocks.
     */
    dsp: number;
    /**
     * Present when the impulse has a postprocessing block.
     */
    postprocessing?: number;
}
/**
 * The input of the record, inline.
 */
export interface RawData {
    /**
     * The file, base64 encoded.
     */
    bufferBase64: string;
    type: RawDataType;
}
/**
 * Device to server. One record per message, or an error for an index the
 * device no longer has.
 */
export interface ImpulseRecordsResponse {
    /**
     * Why the record could not be served.
     */
    error?: string;
    /**
     * Always true; names the message.
     */
    impulseRecordsResponse: boolean;
    /**
     * The record's index.
     */
    index?: number;
    rawData?: RawData1;
    record?: StoredRecord1;
    /**
     * When the record was made.
     */
    timestamp?: number;
}
/**
 * The input of the record, inline.
 */
export interface RawData1 {
    /**
     * The file, base64 encoded.
     */
    bufferBase64: string;
    type: RawDataType;
}
/**
 * The record.
 */
export interface StoredRecord1 {
    result: InferenceResult;
    timing: InferenceTiming;
}
/**
 * The new version runs and registered with the agent.
 */
export interface ModelUpdateSuccess {
    /**
     * New, optional. The verified digest of the inference bundle now active, including after rollback.
     * Identifies the deployed model or workflow independently of the container image; absent when no
     * verified bundle digest is available.
     */
    bundleDigest?: string;
    /**
     * New, optional. The digest of the container image now running, when known. Bundle activation can
     * leave this unchanged; bundleDigest identifies the active inference bundle.
     */
    imageDigest?: string;
    inferenceInfo: InferenceInfo1;
    /**
     * Always `true`.
     */
    modelUpdateSuccess: true;
    operation?: UpdateOperation;
}
/**
 * The project and impulse the device serves after the update.
 */
export interface InferenceInfo1 {
    /**
     * The deployment version the device runs.
     */
    deploymentVersion: number;
    modelType: ModelType;
    /**
     * The Studio project of the impulse.
     */
    projectId: number;
    /**
     * The project's name.
     */
    projectName: string;
    /**
     * The project owner's name, as Studio shows it.
     */
    projectOwner: string;
}
/**
 * The update failed, and the previous version runs again.
 */
export interface ModelUpdateFailure {
    /**
     * New, optional. The version that failed to come up.
     */
    deploymentVersion?: number;
    /**
     * Why the update failed.
     */
    error: string;
    /**
     * Always `false`.
     */
    modelUpdateSuccess: false;
    operation?: UpdateOperation1;
}
/**
 * Device to server, new. Health of the device and its workloads.
 */
export interface Telemetry {
    telemetry: TelemetryBody;
}
/**
 * One telemetry interval.
 */
export interface TelemetryBody {
    agent: AgentInfo;
    connectivity?: ConnectivityMetrics;
    device: DeviceMetrics;
    /**
     * End of the interval, from the device clock.
     */
    windowEnd: number;
    /**
     * Start of the interval, from the device clock. Studio's unique index
     * on project, device and this field makes a repeated interval a no-op.
     */
    windowStart: number;
    /**
     * The workloads of this session's project.
     */
    workloads: WorkloadMetrics[];
}
/**
 * The agent's version and the host's operating system and architecture.
 */
export interface AgentInfo {
    /**
     * The CPU architecture, as `host.arch` in OpenTelemetry: `arm64`, `amd64`.
     */
    arch: string;
    /**
     * The operating system, as `os.name` in OpenTelemetry: `linux`.
     */
    os: string;
    /**
     * The agent's version.
     */
    version: string;
}
/**
 * The session and the collection queue, when the agent reads them.
 */
export interface ConnectivityMetrics {
    /**
     * Captures deleted to make room in the pool.
     */
    capturesDeleted?: number;
    /**
     * Captures in the pool, not yet uploaded.
     */
    capturesPending?: number;
    /**
     * Captures refused because the pool was full.
     */
    capturesRefused?: number;
    /**
     * Seconds this session has been connected in total.
     */
    connectedS?: number;
    /**
     * Reconnections of this session.
     */
    reconnects?: number;
    /**
     * Uploads dropped because a budget was exhausted.
     */
    uploadsDroppedByBudget?: number;
    /**
     * Uploads waiting in the offline queue.
     */
    uploadsQueued?: number;
    /**
     * Uploads that ingestion rejected.
     */
    uploadsRejected?: number;
}
/**
 * The host's own metrics.
 */
export interface DeviceMetrics {
    /**
     * The SoC temperature in degrees Celsius, where the host exposes one.
     */
    'hw.temperature'?: number;
    spoolVolume?: FilesystemMetrics;
    stateVolume?: FilesystemMetrics1;
    /**
     * CPU busy fraction over the window, 0 to 1, across all cores.
     */
    'system.cpu.utilization'?: number;
    /**
     * Memory in use, in bytes.
     */
    'system.memory.usage'?: number;
    /**
     * Memory in use as a fraction of the total, 0 to 1.
     */
    'system.memory.utilization'?: number;
    /**
     * Seconds since the host booted.
     */
    'system.uptime'?: number;
}
/**
 * The spool directory shared with the workloads for large inputs.
 */
export interface FilesystemMetrics {
    /**
     * Free bytes.
     */
    'system.filesystem.free'?: number;
    /**
     * Used fraction, 0 to 1.
     */
    'system.filesystem.utilization'?: number;
}
/**
 * The volume that holds the queue, the capture pool and the records.
 */
export interface FilesystemMetrics1 {
    /**
     * Free bytes.
     */
    'system.filesystem.free'?: number;
    /**
     * Used fraction, 0 to 1.
     */
    'system.filesystem.utilization'?: number;
}
/**
 * One workload's section. In the demo each session carries the one
 * workload of its project.
 */
export interface WorkloadMetrics {
    /**
     * Accelerator busy fraction, 0 to 1, where the SoC exposes it.
     */
    acceleratorUtilization?: number;
    /**
     * CPU busy fraction of the container over the window, 0 to 1.
     */
    'container.cpu.utilization'?: number;
    /**
     * Memory of the container, in bytes.
     */
    'container.memory.usage'?: number;
    /**
     * The deployment version the workload reported at registration.
     */
    deploymentVersion?: number;
    /**
     * Inference events received over the window, per second.
     */
    eventsPerSecond?: number;
    /**
     * The digest of the image the workload runs from, for a container.
     */
    imageDigest?: string;
    /**
     * Whether the agent verified the running container image against its expected digest. Absent when the
     * agent has no container engine access.
     */
    imageVerified?: boolean;
    /**
     * Events that reported a failure.
     */
    inferenceErrors?: number;
    lastUpdate?: LastUpdate;
    /**
     * Models that failed to load.
     */
    modelLoadFailures?: number;
    /**
     * Restarts since the agent started.
     */
    restarts?: number;
    state: WorkloadState;
    /**
     * The ID the agent gave the workload at registration.
     */
    workloadId: string;
}
/**
 * The outcome of the workload's last model update, if there was one.
 */
export interface LastUpdate {
    /**
     * The version the update targeted.
     */
    deploymentVersion: number;
    /**
     * Why the update failed.
     */
    error?: string;
    operation: UpdateOperation2;
    /**
     * Whether the new version came up and registered.
     */
    success: boolean;
    /**
     * When the update finished.
     */
    timestamp: number;
}
/**
 * The session was accepted. Remote Management always sends the server's clock with it.
 */
export interface HelloAccepted {
    /**
     * Always `true`.
     */
    hello: true;
    /**
     * The server's clock when it accepted the session.
     */
    serverTimestamp: number;
    capabilities?: ServerCapabilities;
}
/**
 * New, optional. What the server supports beyond the existing protocol.
 */
export interface ServerCapabilities {
    /**
     * Whether Studio consumes and stores `rulesVersion` on summaries. Without
     * this capability the agent omits the field, because older Studio versions
     * ignore it and lose the rules-version provenance. Studio support is tracked
     * at https://github.com/edgeimpulse/closed-loop-demo/issues/52.
     */
    summaryRulesVersion?: boolean;
    /**
     * The server accepts the `telemetry` message. Without it the agent sends
     * none, because an older server answers an unknown message with an error.
     */
    telemetry?: boolean;
}
/**
 * The session was refused. Remote Management sends the reason and no timestamp.
 */
export interface HelloRejected {
    /**
     * Always `false`.
     */
    hello: false;
    /**
     * Why the session was refused, for the device log and the local status.
     */
    err: string;
    /**
     * Whether the credential was valid, when the rejection was about it.
     */
    auth?: boolean;
}
/**
 * Server to device. Requests a sample using the existing sampling protocol.
 * The device acknowledges with `SampleResponse` and reports its progress.
 */
export interface SampleRequest {
    sample: SampleRequestSample;
}
/**
 * What to sample and where to upload it; an object, unlike the boolean response.
 */
export interface SampleRequestSample {
    /**
     * The label to assign to the sample.
     */
    label: string;
    /**
     * The requested sample length in milliseconds.
     */
    length: number;
    /**
     * The ingestion upload path, not a local filesystem path.
     */
    path: string;
    /**
     * The key used to sign the sample for ingestion.
     */
    hmacKey: string;
    /**
     * The sampling interval in milliseconds; may be fractional.
     */
    interval: number;
    /**
     * Optional sensor name from Hello; absent to use the device's default.
     */
    sensor?: string;
    /**
     * Optional color associated with the sample's label.
     */
    labelColor?: string;
    /**
     * Samples already collected in a continuous-sampling sequence.
     */
    collectedSampleCount?: number;
    /**
     * Requested number of samples in a continuous-sampling sequence.
     */
    targetSampleCount?: number;
}
/**
 * Server to device. Requests a live stream of snapshots at the chosen
 * resolution.
 */
export interface StartSnapshotStreamRequest {
    /**
     * The start-snapshot request flag; retains the existing boolean type.
     */
    startSnapshot: boolean;
    /**
     * The requested snapshot resolution.
     */
    resolution: 'high' | 'low';
}
/**
 * Server to device. Requests that snapshot streaming stop.
 */
export interface StopSnapshotStreamRequest {
    /**
     * The stop-snapshot request flag; retains the existing boolean type.
     */
    stopSnapshot: boolean;
}
/**
 * Server to device. Requests live inference records, acknowledged
 * individually with `impulseRecordAck`.
 */
export interface StartInferenceStreamRequest {
    /**
     * The start-inference-stream request flag; retains the existing boolean type.
     */
    startInferenceStream: boolean;
}
/**
 * Server to device. Requests that live inference streaming stop.
 */
export interface StopInferenceStreamRequest {
    /**
     * The stop-inference-stream request flag; retains the existing boolean type.
     */
    stopInferenceStream: boolean;
}
/**
 * Server to device. Acknowledges either a live `impulseRecord` or an
 * `impulseRecordsResponse`. A negative acknowledgement can stop the stream
 * or abort the outstanding records request.
 */
export interface ImpulseRecordAck {
    /**
     * Whether the server accepted the record message.
     */
    impulseRecordAck: boolean;
    /**
     * The index of the record being acknowledged.
     */
    index: number;
    /**
     * Optional explanation when the record was not accepted.
     */
    error?: string;
}
/**
 * Server to device. Studio asks for records by index.
 */
export interface ImpulseRecordsRequest {
    impulseRecordRequest: ImpulseRecordsRequestBody;
}
/**
 * Which records.
 */
export interface ImpulseRecordsRequestBody {
    /**
     * One record, by index.
     */
    index?: number;
    /**
     * Several records, by index.
     */
    list?: number[];
    range?: RecordRange;
}
/**
 * A range of records.
 */
export interface RecordRange {
    /**
     * The first index wanted.
     */
    first: number;
    /**
     * The last index wanted, included.
     */
    last: number;
}
/**
 * Server to device. A hint that a newer deployment exists. The agent acts on
 * it only when its update policy follows the latest deployment.
 */
export interface NewModelAvailable {
    deploymentVersion: DeploymentVersionOrLatest;
    /**
     * Always true; names the message.
     */
    newModelAvailable: boolean;
}
/**
 * Server to device, new. Deploy a version, whatever the update policy.
 */
export interface DeployModel {
    deployModel: DeploymentTarget;
}
/**
 * The version to deploy.
 */
export interface DeploymentTarget {
    /**
     * The deployment version to run. A rollback names the version to go
     * back to, which the device must still hold.
     */
    deploymentVersion: number;
}
/**
 * Server to device, new. Roll back to a version the device still holds.
 */
export interface RollbackModel {
    rollbackModel: DeploymentTarget1;
}
/**
 * The version to go back to.
 */
export interface DeploymentTarget1 {
    /**
     * The deployment version to run. A rollback names the version to go
     * back to, which the device must still hold.
     */
    deploymentVersion: number;
}
