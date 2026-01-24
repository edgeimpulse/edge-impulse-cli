export type RunnerErrorResponse = {
    success: false;
    error: string;
};

export type RunnerHelloRequest = {
    hello: 1;
};

export enum RunnerHelloHasAnomaly {
    None = 0,
    KMeans = 1,
    GMM = 2,
    VisualGMM = 3,
    VisualPatchcore = 4
}

export enum RunnerHelloInferencingEngine {
    None = 255,
    Utensor = 1,
    Tflite = 2,
    Cubeai = 3,
    TfliteFull = 4,
    TensaiFlow = 5,
    TensorRT = 6,
    Drpai = 7,
    TfliteTidl = 8,
    Akida = 9,
    Syntiant = 10,
    OnnxTidl = 11,
    Memryx = 12,
    EthosLinux = 13,
    Aton = 14,
    CevaNpn = 15,
    NordicAxon = 16,
    VlmConnector = 17
}

export type RunnerBlockThreshold = {
    id: number,
    type: string,
} & { [ key: string ]: number | string /* needs to be string too, otherwise TS trips (as type: string) */ };

export type SetRunnerBlockThreshold = {
    id: number,
} & { [ key: string ]: number };

export type RunnerHelloResponseModelParameters = {
    axis_count: number;
    frequency: number;
    has_anomaly: RunnerHelloHasAnomaly;
    /**
     * NOTE: This field is _experimental_. It might change when object tracking
     * is released publicly.
     */
    has_object_tracking?: boolean;
    input_features_count: number;
    image_input_height: number;
    image_input_width: number;
    image_input_frames: number;
    image_channel_count: number;
    image_resize_mode?: 'none' | 'fit-shortest' | 'fit-longest' | 'squash';
    interval_ms: number;
    label_count: number;
    sensor: number;
    labels: string[];
    model_type: 'classification' | 'object_detection' | 'constrained_object_detection' | 'freeform';
    slice_size: undefined | number;
    use_continuous_mode: undefined | boolean;
    has_performance_calibration: boolean | undefined;
    inferencing_engine?: undefined | RunnerHelloInferencingEngine;
    thresholds: RunnerBlockThreshold[] | undefined,
    vlm_model_download_url?: string,
};

export type RunnerHelloResponseProject = {
    deploy_version: number;
    id: number;
    name: string;
    owner: string;
};

export type RunnerHelloResponseInferencingEngine = {
    inferencing_engine?: undefined | RunnerHelloInferencingEngine;
    properties?: undefined | string[];
};

export type RunnerHelloResponse = {
    features_shm?: {
        name: string,
        size_bytes: number,
        type: 'float32',
        elements: number,
    };
    features_shm_error?: string;
    freeform_output_shm?: {
        index: number,
        name: string,
        size_bytes: number,
        type: 'float32',
        elements: number,
    }[];
    model_parameters: RunnerHelloResponseModelParameters;
    project: RunnerHelloResponseProject;
    inferencing_engine: RunnerHelloResponseInferencingEngine;
    success: true;
} | RunnerErrorResponse;

export type RunnerClassifyRequest = {
    classify: number[];
} | {
    classify_shm: {
        elements: number,
    },
};

export type RunnerClassifyContinuousRequest = {
    classify_continuous: number[];
} | {
    classify_continuous_shm: {
        elements: number,
    },
};

// This is the spec that the EIM file returns on classification
export type EimRunnerClassifyResponseSuccess = {
    result: {
        classification?: { [k: string]: number };
        bounding_boxes?: {
            label: string,
            value: number,
            x: number,
            y: number,
            width: number,
            height: number,
        }[],
        object_tracking?: {
            object_id: number,
            label: string,
            value: number,
            x: number,
            y: number,
            width: number,
            height: number,
        }[],
        visual_anomaly_grid?: {
            label: string,
            value: number,
            x: number,
            y: number,
            width: number,
            height: number,
        }[],
        visual_anomaly_max?: number;
        visual_anomaly_mean?: number;
        anomaly?: number;
        resizeMode?: 'none' | 'fit-shortest' | 'fit-longest' | 'squash';
        resized?: {
            originalWidth: number,
            originalHeight: number,
            newWidth: number,
            newHeight: number,
        };
        freeform?: 'shm' | number[][];
    },
    timing: {
        dsp: number;
        classification: number;
        postprocessing?: number;
        anomaly: number;
    },
    info?: string;
};

// This is the _public_ type that we return after classify() calls
export type RunnerClassifyResponseSuccess = {
    result: Omit<EimRunnerClassifyResponseSuccess['result'], 'freeform'> & {
        freeform?: number[][],
    },
    timing: EimRunnerClassifyResponseSuccess['timing'],
    info: EimRunnerClassifyResponseSuccess['info'],
};

export type RunnerSetThresholdRequest = {
    set_threshold: SetRunnerBlockThreshold;
};

export type RunnerSetThresholdResponse = { success: true } | RunnerErrorResponse;

export type ModelInformation = {
    project: RunnerHelloResponseProject,
    modelParameters: RunnerHelloResponseModelParameters & {
        sensorType: 'unknown' | 'accelerometer' | 'microphone' | 'camera' | 'positional'
    },
    inferencingEngine: RunnerHelloResponseInferencingEngine,
};
