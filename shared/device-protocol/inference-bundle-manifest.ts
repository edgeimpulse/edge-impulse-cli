// Generated from device-services-contracts/schema/ by device-services-contracts/generate.sh. Do not edit.

/**
 * The manifest.json the agent writes and workloads read in every inference bundle. A model bundle
 * serves exactly one model on the inference runner; a workflow bundle serves one or more models and a
 * workflow on the workflow runtime. Paths are relative to the bundle directory. Workloads must also
 * verify the listed files, SHA-256 checksums, unique bundle-local model IDs, deployment target and
 * minimum runtime version before activation.
 */
export type InferenceBundleManifest = ModelBundleManifest | WorkflowBundleManifest;
/**
 * A model inference bundle: exactly one model, served by the inference runner. The `workflow` property
 * is forbidden.
 */
export type ModelBundleManifest = ManifestCommon & {
    /**
     * Always `model`.
     */
    kind: 'model';
    /**
     * Exactly one model for the inference runner.
     *
     * @minItems 1
     * @maxItems 1
     */
    models?: [BundleModel];
    runtime: InferenceRunnerRequirement;
    workflow?: never;
};
/**
 * The model file's path relative to the bundle directory.
 */
export type BundleRelativePath = string;
/**
 * The inference runner and minimum version needed to serve this bundle.
 */
export type InferenceRunnerRequirement = RuntimeRequirementCommon & {
    /**
     * Always `inference_runner`.
     */
    kind: 'inference_runner';
};
/**
 * A workflow inference bundle: one or more models and a workflow, served by the workflow runtime.
 */
export type WorkflowBundleManifest = ManifestCommon & {
    /**
     * Always `workflow`.
     */
    kind: 'workflow';
    runtime: WorkflowRuntimeRequirement;
    workflow: WorkflowDefinition;
};
/**
 * The workflow runtime and minimum version needed to serve this bundle.
 */
export type WorkflowRuntimeRequirement = RuntimeRequirementCommon & {
    /**
     * Always `workflow_runtime`.
     */
    kind: 'workflow_runtime';
};
/**
 * The workflow file's path relative to the bundle directory.
 */
export type BundleRelativePath1 = string;

/**
 * Fields shared by model and workflow inference bundle manifests.
 */
export interface ManifestCommon {
    /**
     * The major version of this manifest format. Readers must reject unsupported versions before
     * activating the bundle. Independent of deploymentVersion and runtime.minVersion.
     */
    manifestVersion: 1;
    /**
     * The models in the bundle, at least one. A model bundle narrows this to exactly one entry.
     *
     * @minItems 1
     */
    models: [BundleModel, ...BundleModel[]];
    /**
     * The Studio deployment target format, for example runner-linux-aarch64-qnn.
     */
    target: string;
}
/**
 * One model in the inference bundle. Its bundle-local ID and Studio identity are also reported in
 * workload registration.
 */
export interface BundleModel {
    /**
     * The Studio deployment version the model was built from.
     */
    deploymentVersion: number;
    /**
     * The model's inference engine, for example tflite, tensorrt or qnn.
     */
    engine: string;
    /**
     * The bundle-local model ID, unique within the manifest and used by workflow references and
     * registration.
     */
    id: string;
    /**
     * The impulse within the Studio project.
     */
    impulseId: number;
    /**
     * What the model produces, using the same names as workload registration.
     */
    modelType: 'classification' | 'object_detection' | 'constrained_object_detection' | 'freeform';
    path: BundleRelativePath;
    /**
     * The Studio project the model was built in.
     */
    projectId: number;
    /**
     * The SHA-256 checksum of the model file, as 64 hexadecimal digits without a prefix.
     */
    sha256: string;
}
/**
 * The runtime version requirement shared by both bundle kinds.
 */
export interface RuntimeRequirementCommon {
    /**
     * The minimum Semantic Version 2.0.0 the workload must satisfy, including optional prerelease and
     * build metadata. This is a version, not a version range; comparing it to the installed runtime is a
     * consumer responsibility.
     */
    minVersion: string;
}
/**
 * The workflow definition that refers to the bundle-local model IDs.
 */
export interface WorkflowDefinition {
    path: BundleRelativePath1;
}
