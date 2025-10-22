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
}

export type RunnerBlockThreshold = {
        id: number,
        type: 'anomaly_gmm',
        min_anomaly_score: number,
    } | {
        id: number,
        type: 'object_detection',
        min_score: number,
    } | {
        id: number,
        type: 'object_tracking',
        keep_grace: number,
        max_observations: number,
        threshold: number,
    } | {
        id: number,
        type: 'classification',
        min_score: number,
};

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

export type RunnerClassifyResponseSuccess = {
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
        /**
         * NOTE: This field is _experimental_. It might change when object tracking
         * is released publicly.
         */
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
        freeform?: number[][];
    },
    timing: {
        dsp: number;
        classification: number;
        anomaly: number;
    },
    info?: string;
};

export type RunnerClassifyResponse = ({
    success: true;
} & RunnerClassifyResponseSuccess) | RunnerErrorResponse;

export type RunnerSetThresholdRequest = {
    set_threshold: {
        id: number,
        min_anomaly_score: number,
    } | {
        id: number,
        min_score: number,
    } | {
        id: number,
        keep_grace: number,
        max_observations: number,
        threshold: number,
    };
};

export type RunnerSetThresholdResponse = { success: true } | RunnerErrorResponse;

export type ModelInformation = {
    project: RunnerHelloResponseProject,
    modelParameters: RunnerHelloResponseModelParameters & {
        sensorType: 'unknown' | 'accelerometer' | 'microphone' | 'camera' | 'positional'
    },
    inferencingEngine: RunnerHelloResponseInferencingEngine,
};
