// Generated from device-services-contracts/schema/ by device-services-contracts/generate.sh. Do not edit.

/**
 * Any body of the contract, in either direction. The root of the
 * `workload-contract.json` schema.
 *
 * The contract is HTTP/1.1 on a Unix domain socket under the agent's
 * runtime directory. Bodies are JSON. Paths carry the major version:
 *
 * | Operation | Method and path | Request | Response |
 * | --- | --- | --- | --- |
 * | Register | `POST /v1/register` | `RegisterRequest` | `RegisterResponse` |
 * | Post events | `POST /v1/events` | `EventBatch` | `EventBatchResponse` |
 * | Command stream | `GET /v1/commands` | none | server-sent events, each `data:` a `Command` |
 * | Command result | `POST /v1/commands/{commandId}/result` | `CommandResult` | empty |
 *
 * The workload registers before using the other operations. An inference
 * workload initially reports no models, then replaces that registration
 * after a successful bundle activation with the models it now serves. A
 * dropped command stream is reopened for the same registered session. If
 * the agent loses that session or returns `not_registered`, the workload
 * registers again with its current state before reopening the stream.
 *
 * Commands are delivered at least once: the agent sends a command without a
 * result again when the stream reconnects. A workload handles the same command
 * ID idempotently. If the agent stops waiting for a command, a later result may
 * be refused with `unknown_command`.
 *
 * A refused request answers an HTTP error status with a `ContractError`.
 */
export type WorkloadContractMessage =
    RegisterRequest | RegisterResponse | EventBatch | EventBatchResponse | Command | CommandResult | ContractError;
/**
 * Workload to agent: `POST /v1/register`. The workload must register before using the other operations
 * on its socket. Registration replaces the state for that workload session rather than creating
 * another workload. An inference workload registers at startup with an empty `models` array before it
 * has a bundle, and registers again after successful activation with the models it now serves.
 * Reopening a dropped command stream does not require another registration while the agent retains the
 * session. After `not_registered` or an agent restart, the workload registers again with its current
 * active models.
 */
export type RegisterRequest = InferenceRunnerRegistration | WorkflowRuntimeRegistration | ApplicationRegistration;
/**
 * The Linux runner in agent-managed mode. Its artifact is the container image it runs from. It
 * registers with empty `models` at startup, then with the single model from its active inference
 * bundle.
 */
export type InferenceRunnerRegistration = RegisterRequestCommon & {
    /**
     * The runner's input mode: camera, microphone or HTTP input. Runners report it both before and after
     * bundle activation. Optional for registrations created before mode reporting was introduced; absence
     * means unspecified.
     */
    mode?: 'camera' | 'microphone' | 'http';
    artifact: Artifact;
    /**
     * Always `inference_runner`.
     */
    kind: 'inference_runner';
};
/**
 * The contract's major version, the same as in the path.
 */
export type ContractVersion = 1;
/**
 * What the model produces.
 */
export type ModelType = 'classification' | 'object_detection' | 'constrained_object_detection' | 'freeform';
/**
 * A threshold of one block of the impulse, exactly as the `.eim` reports
 * it in its `model_parameters.thresholds`: the block's ID, its type, and
 * the block's numeric parameters as sibling keys. The SDK adds parameters
 * and block types with each release, so the parameters are an open map
 * rather than a closed union, and the values are numbers. The types and
 * keys the SDK reports today
 * (`edge-impulse-sdk/classifier/postprocessing/ei_postprocessing_thresholds.h`):
 *
 * | `type` | Keys |
 * | --- | --- |
 * | `classification` | `min_score` (the runner's monitor reads it; the SDK does not report it yet) |
 * | `object_detection` | `min_score`; PaddleOCR instead `min_score_pixel`, `min_score_box`,
 * `unclip_ratio` |
 * | `anomaly_gmm` | `min_anomaly_score`, for GMM, K-means and visual anomaly blocks |
 * | `object_tracking` | `keep_grace`, `max_observations`, `threshold`; SORT instead `max_age`,
 * `min_hits`, `iou_threshold` |
 * | `performance_calibration` | `average_window_duration_ms`, `detection_threshold`, `suppression_ms`,
 * `suppression_flags` |
 *
 * A model may report no classification threshold.
 */
export type BlockThreshold = {id: number; type: string} & {[parameter: string]: number | string};
/**
 * Whether this is the workload's container image or its inference bundle.
 */
export type ArtifactKind = 'containerImage' | 'inferenceBundle';
/**
 * The workflow runtime serves an inference bundle of kind workflow. Its artifact identifies its image
 * or inferenceBundle; `models` lists the models from the active manifest, and is empty before the
 * first activation.
 */
export type WorkflowRuntimeRegistration = RegisterRequestCommon & {
    artifact: Artifact1;
    /**
     * Always `workflow_runtime`.
     */
    kind: 'workflow_runtime';
};
/**
 * A customer application on the SDK. The agent reports it by its
 * `version` when it has no artifact.
 */
export type ApplicationRegistration = RegisterRequestCommon & {
    artifact?: Artifact2;
    /**
     * Always `application`.
     */
    kind: 'application';
};
/**
 * Which inputs to attach to events, until a command replaces it.
 */
export type InputPolicy = InputPolicyNone | InputPolicyFraction | InputPolicyAll;
/**
 * One inference of the workload.
 */
export type InferenceEvent = FailedInferenceEvent | CompletedInferenceEvent;
/**
 * The inference failed, in one model or before any ran.
 */
export type FailedInferenceEvent = InferenceEventCommon & {
    failure: InferenceFailure;
    /**
     * The results of the models that did finish, if any.
     */
    results?: ModelResult[];
};
/**
 * The input, when the input policy selected it.
 */
export type Input = InlineInput | SpoolInput;
/**
 * In the message, base64 encoded. Up to the inline size limit.
 */
export type InlineInput = InputCommon & {
    /**
     * The bytes, base64 encoded.
     */
    bufferBase64: string;
    /**
     * Always `inline`.
     */
    location: 'inline';
};
/**
 * The input's format.
 */
export type InputFormat = 'jpg' | 'wav' | 'cbor' | 'json';
/**
 * A file in the spool directory, which the agent copies if it keeps the
 * input and otherwise ignores.
 */
export type SpoolInput = InputCommon & {
    /**
     * Always `spool`.
     */
    location: 'spool';
    /**
     * The name of a file directly in the spool directory, without a directory
     * part. The agent refuses other paths, symbolic links and files with other
     * hard links.
     */
    path: string;
    /**
     * The file's size, so the agent can apply its budget before reading it.
     */
    sizeBytes: number;
};
/**
 * How the input image was resized, for image models.
 */
export type ResizeMode = 'none' | 'fit-shortest' | 'fit-longest' | 'squash';
/**
 * Every model finished. One result per model, at least one. `failure` is forbidden, so a failed event
 * never matches this variant.
 */
export type CompletedInferenceEvent = InferenceEventCommon & {
    /**
     * One result per model that ran on the input, at least one.
     *
     * @minItems 1
     */
    results: [ModelResult, ...ModelResult[]];
    failure?: never;
};
/**
 * Agent to workload: one event of the command stream.
 */
export type Command = ActivateBundleCommand | UpdateInputPolicyCommand | CaptureCommand;
/**
 * Activate a staged inference bundle. Needs the `activateBundle` capability. The workload reads
 * manifest.json from the bundle directory and registers again with the models it now serves.
 */
export type ActivateBundleCommand = CommandCommon & {
    bundle: InferenceBundle;
    /**
     * Always `activateBundle`.
     */
    type: 'activateBundle';
};
/**
 * Replace the input policy from the registration.
 */
export type UpdateInputPolicyCommand = CommandCommon & {
    inputPolicy: InputPolicy1;
    /**
     * Always `updateInputPolicy`.
     */
    type: 'updateInputPolicy';
};
/**
 * The new input policy.
 */
export type InputPolicy1 = InputPolicyNone | InputPolicyFraction | InputPolicyAll;
/**
 * Take one sample from a sensor. Needs the `capture` capability.
 */
export type CaptureCommand = CommandCommon & {
    capture: CaptureRequest;
    /**
     * Always `capture`.
     */
    type: 'capture';
};
/**
 * Workload to agent: `POST /v1/commands/{commandId}/result`. The result names the command's type and
 * whether it succeeded, so a successful `capture` must carry its sample, and the agent checks the type
 * against the command it sent. If the agent no longer waits for the command, it may answer
 * `unknown_command`.
 */
export type CommandResult = CommandFailure | CaptureResult | CommandSuccess;
/**
 * The command's type.
 */
export type CommandType = 'activateBundle' | 'updateInputPolicy' | 'capture';
/**
 * The sample's bytes, inline or in the spool.
 */
export type Input1 = InlineInput | SpoolInput;
/**
 * Always `capture`.
 */
export type CaptureResultType = 'capture';
/**
 * The command's type.
 */
export type PlainCommandType = 'activateBundle' | 'updateInputPolicy';
/**
 * Why the request was refused.
 */
export type ContractErrorCode =
    'invalid_request' | 'not_registered' | 'rate_limited' | 'unknown_command' | 'unsupported_version' | 'internal';

/**
 * The fields every variant of `RegisterRequest` shares.
 */
export interface RegisterRequestCommon {
    /**
     * What the workload can do beyond posting events, from
     * [`capability`]. Unknown names are ignored.
     */
    capabilities?: string[];
    contractVersion: ContractVersion;
    /**
     * A snapshot of the models the workload currently serves. An inference workload sends an empty array
     * on its initial registration before a bundle is active. After successful activation it replaces the
     * registration with the models from the active bundle. A registration used to recover a lost agent
     * session reports the models that remain active in the workload.
     */
    models: ModelRegistration[];
    /**
     * The sensors the workload can capture from, with the names and
     * frequencies Studio validates. The agent declares them in Hello.
     */
    sensors?: Sensor[];
    /**
     * The workload's software version: the runner's version, for example.
     */
    version: string;
}
/**
 * One model the workload serves from its active inference bundle, with identity fields from
 * manifest.json and runtime model information.
 */
export interface ModelRegistration {
    /**
     * The deployment version of the impulse the model was built from.
     */
    deploymentVersion: number;
    /**
     * The inference engine, as the `.eim` names it: `tflite`, `tensorrt`,
     * `qnn`.
     */
    engine: string;
    /**
     * The bundle-local model ID from manifest.json, which events refer to. Unique within the workload.
     */
    id: string;
    /**
     * The impulse within the project.
     */
    impulseId: number;
    /**
     * The model's labels, in the order its output uses.
     */
    labels: string[];
    modelType: ModelType;
    /**
     * The Studio project the model was built in. The agent opens one
     * Remote Management session per project.
     */
    projectId: number;
    /**
     * The project's name, which the agent's Hello reports to Studio.
     */
    projectName?: string;
    /**
     * The project owner's name, which the agent's Hello reports to Studio.
     */
    projectOwner?: string;
    /**
     * The model's per-block thresholds, as the `.eim` reports them. May be empty.
     */
    thresholds?: BlockThreshold[];
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
 * The container image the runner runs from; the bundle it serves is represented by `models`.
 */
export interface Artifact {
    /**
     * The image or inference bundle digest, when the workload knows it.
     */
    digest?: string;
    kind: ArtifactKind;
    /**
     * The container image reference or the inference bundle directory.
     */
    reference: string;
}
/**
 * The container image the runtime runs from or the inferenceBundle it serves; the active bundle's
 * models are reported in `models`.
 */
export interface Artifact1 {
    /**
     * The image or inference bundle digest, when the workload knows it.
     */
    digest?: string;
    kind: ArtifactKind;
    /**
     * The container image reference or the inference bundle directory.
     */
    reference: string;
}
/**
 * The artifact, when something deploys the application.
 */
export interface Artifact2 {
    /**
     * The image or inference bundle digest, when the workload knows it.
     */
    digest?: string;
    kind: ArtifactKind;
    /**
     * The container image reference or the inference bundle directory.
     */
    reference: string;
}
/**
 * Agent to workload: the answer to a registration.
 */
export interface RegisterResponse {
    /**
     * The agent marks the workload unhealthy when its command stream has
     * been down for longer than this. Announced so the workload reconnects
     * well within it.
     */
    commandStreamTimeoutS?: number;
    /**
     * Inputs up to this size travel inline; larger ones go to the spool.
     */
    inlineSizeLimitBytes: number;
    inputPolicy: InputPolicy;
    /**
     * The spool directory shared with the agent, as the workload sees it.
     * Absent when the workload has no spool and must drop larger inputs.
     */
    spoolDirectory?: string;
    /**
     * The ID the agent gave this workload.
     */
    workloadId: string;
}
/**
 * Attach no input. `fraction` is forbidden in this mode.
 */
export interface InputPolicyNone {
    /**
     * Always `none`.
     */
    mode: 'none';
    fraction?: never;
}
/**
 * Attach this fraction of inputs, 0 to 1.
 */
export interface InputPolicyFraction {
    /**
     * The fraction of inputs to attach, 0 to 1.
     */
    fraction: number;
    /**
     * Always `fraction`.
     */
    mode: 'fraction';
    /**
     * At most this many inputs per second.
     */
    maxPerSecond?: number;
}
/**
 * Attach every input. `fraction` is forbidden in this mode.
 */
export interface InputPolicyAll {
    /**
     * Always `all`.
     */
    mode: 'all';
    fraction?: never;
    /**
     * At most this many inputs per second.
     */
    maxPerSecond?: number;
}
/**
 * Workload to agent: `POST /v1/events`.
 */
export interface EventBatch {
    /**
     * The events since the last batch, oldest first. At least one.
     *
     * @minItems 1
     */
    events: [InferenceEvent, ...InferenceEvent[]];
}
/**
 * The fields every variant of `InferenceEvent` shares.
 */
export interface InferenceEventCommon {
    /**
     * When the input was captured, if the workload knows it.
     */
    captureTimestamp?: number;
    /**
     * Unique within the workload, so a retried batch is idempotent.
     */
    id: string;
    /**
     * When the inference ran.
     */
    inferenceTimestamp: number;
    input?: Input;
}
/**
 * The fields every variant of `Input` shares.
 */
export interface InputCommon {
    /**
     * A reference to the original capture the input was cut from, when the
     * workload keeps one.
     */
    captureRef?: string;
    type: InputFormat;
}
/**
 * What failed.
 */
export interface InferenceFailure {
    /**
     * The model that failed, when one did; absent when the input could not
     * be read at all.
     */
    modelId?: string;
    /**
     * What went wrong, for a person reading the records.
     */
    reason: string;
}
/**
 * The result of one model on one input.
 */
export interface ModelResult {
    /**
     * A note from the `.eim`, when it returns one.
     */
    info?: string;
    /**
     * The model's ID from the registration.
     */
    modelId: string;
    result: InferenceResult;
    timing: InferenceTiming;
}
/**
 * The model's result, as the `.eim` returns it.
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
 * Time spent in each stage.
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
 * Agent to workload: the answer to a batch. The device agent accepts the
 * whole batch or refuses the request, so `accepted` is the number of events in
 * the batch, deduplicated events included, and `dropped` is zero.
 */
export interface EventBatchResponse {
    /**
     * Events of the batch the agent accepted, counting the ones it had
     * already accepted under the same event ID, so a retried batch is accepted
     * again without being kept twice.
     */
    accepted: number;
    /**
     * Events of the batch the agent dropped. The device agent always returns
     * zero because it refuses a whole batch with `rate_limited` instead of partly
     * accepting it.
     */
    dropped: number;
}
/**
 * The fields every variant of `Command` shares.
 */
export interface CommandCommon {
    /**
     * Unique per workload. The result names it. Delivery is at least once,
     * so the workload handles another command with the same ID idempotently.
     */
    id: string;
}
/**
 * The staged inference bundle to activate; its manifest.json describes the models.
 */
export interface InferenceBundle {
    /**
     * The bundle's deployment version, as Studio names it.
     */
    deploymentVersion: number;
    /**
     * The bundle's digest, when the agent verified it.
     */
    digest?: string;
    /**
     * A single-model bundle for the runner or a workflow bundle for the workflow runtime.
     */
    kind: 'model' | 'workflow';
    /**
     * The staged directory containing manifest.json, as the workload sees it.
     */
    path: string;
}
/**
 * What to capture.
 */
export interface CaptureRequest {
    /**
     * How long to record, for a microphone. Absent for a camera, which
     * takes one frame.
     */
    lengthMs?: number;
    /**
     * The sensor's name from the registration.
     */
    sensor: string;
}
/**
 * The command failed.
 */
export interface CommandFailure {
    /**
     * The command's ID.
     */
    commandId: string;
    /**
     * Why the command failed.
     */
    reason: string;
    /**
     * Always `false`.
     */
    success: false;
    type: CommandType;
}
/**
 * A `capture` command succeeded, with its sample.
 */
export interface CaptureResult {
    capture: CaptureSample;
    /**
     * The command's ID.
     */
    commandId: string;
    /**
     * Always `true`.
     */
    success: true;
    type: CaptureResultType;
}
/**
 * The sample.
 */
export interface CaptureSample {
    input: Input1;
    metadata: CaptureMetadata;
}
/**
 * What the workload knows about the sample.
 */
export interface CaptureMetadata {
    /**
     * When the capture started.
     */
    capturedAt: number;
    /**
     * Recording length, for a microphone.
     */
    durationMs?: number;
    /**
     * Anything else, as strings, which the upload's metadata carries.
     */
    extra?: {
        [k: string]: string;
    };
    /**
     * Image height in pixels, for a camera.
     */
    height?: number;
    /**
     * Sample rate, for a microphone.
     */
    sampleRateHz?: number;
    /**
     * The sensor's name from the registration.
     */
    sensor: string;
    /**
     * Image width in pixels, for a camera.
     */
    width?: number;
}
/**
 * Any other command succeeded.
 */
export interface CommandSuccess {
    /**
     * The command's ID.
     */
    commandId: string;
    /**
     * Always `true`.
     */
    success: true;
    type: PlainCommandType;
}
/**
 * Agent to workload: the body of an HTTP error response.
 */
export interface ContractError {
    code: ContractErrorCode;
    /**
     * Detail for a person reading the workload's log.
     */
    message: string;
}
