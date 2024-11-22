export type ClientConnectionType = 'ip' | 'daemon';

export interface MgmtInterfaceHelloV1 {
    hello: {
        version: 1;
        apiKey: string;
        deviceId: string;
        deviceType: string;
        connection: ClientConnectionType;
        sensors?: string[];
    };
}

export interface MgmtInterfaceHelloV2 {
    hello: {
        version: 2;
        apiKey: string;
        deviceId: string;
        deviceType: string;
        connection: ClientConnectionType;
        sensors: {
            name: string;
            maxSampleLengthS: number;
            frequencies: number[]
        }[];
    };
}

export interface MgmtInterfaceHelloV3 {
    hello: {
        version: 3;
        apiKey: string;
        deviceId: string;
        deviceType: string;
        connection: ClientConnectionType;
        sensors: {
            name: string;
            maxSampleLengthS: number;
            frequencies: number[]
        }[];
        supportsSnapshotStreaming: boolean;
    };
}

export type MgmtInterfaceInferenceInfo = {
    projectId: number,
    projectOwner: string,
    projectName: string,
    deploymentVersion: number,
    modelType: 'classification' | 'object_detection' | 'constrained_object_detection',
};

export interface MgmtInterfaceHelloV4 {
    hello: {
        version: 4;
        apiKey: string;
        deviceId: string;
        deviceType: string;
        connection: ClientConnectionType;
        sensors: {
            name: string;
            maxSampleLengthS: number;
            frequencies: number[];
        }[];
        supportsSnapshotStreaming: boolean;
    } & ({
        mode: 'ingestion',
    } | {
        mode: 'inference';
        inferenceInfo: MgmtInterfaceInferenceInfo;
        availableRecords: {
            firstIndex: number;
            firstTimestamp: number;
            lastIndex: number;
            lastTimestamp: number;
        };
    });
}

export interface MgmtInterfaceHelloResponse {
    hello: boolean;
    err?: string;
    auth?: boolean;
    serverTimestamp: number;
}

export interface MgmtInterfaceSampleRequestSample {
    label: string;
    length: number;
    path: string;
    hmacKey: string;
    interval: number;
    sensor?: string;
}

export interface MgmtInterfaceSampleRequest {
    sample: MgmtInterfaceSampleRequestSample;
}

export interface MgmtInterfaceSampleResponse {
    sample: boolean;
    error?: string;
}

export interface MgmtInterfaceSampleFinishedResponse {
    sampleFinished: boolean;
}

export interface MgmtInterfaceSampleReadingResponse {
    sampleReading: boolean;
    progressPercentage: number;
}

export interface MgmtInterfaceSampleUploadingResponse {
    sampleUploading: boolean;
}

export interface MgmtInterfaceSampleStartedResponse {
    sampleStarted: boolean;
}

export interface MgmtInterfaceSampleProcessingResponse {
    sampleProcessing: boolean;
}

export interface MgmtInterfaceStartSnapshotStreamRequest {
    startSnapshot: boolean;
    resolution: 'high' | 'low';
}

export interface MgmtInterfaceStopSnapshotStreamRequest {
    stopSnapshot: boolean;
}

export interface MgmtInterfaceSnapshotStreamStartedResponse {
    snapshotStarted: boolean;
}

export interface MgmtInterfaceSnapshotStreamStoppedResponse {
    snapshotStopped: boolean;
}

export interface MgmtInterfaceSnapshotStreamFailedResponse {
    snapshotFailed: boolean;
    error: string;
}

export interface MgmtInterfaceSnapshotResponse {
    snapshotFrame: string;
    fileName: string;
}

export interface MgmtInterfaceStartInferenceStreamRequest {
    startInferenceStream: boolean;
}

export interface MgmtInterfaceStopInferenceStreamRequest {
    stopInferenceStream: boolean;
}

export interface MgmtInterfaceInferenceStreamStartedResponse {
    inferenceStreamStarted: boolean;
}

export interface MgmtInterfaceInferenceStreamStoppedResponse {
    inferenceStreamStopped: boolean;
}

export interface MgmtInterfaceInferenceStreamFailedResponse {
    inferenceStreamFailed: boolean;
    error: string;
}

export interface MgmtInterfaceInferenceSummary {
    inferenceSummary: {
        firstIndex: number;
        lastIndex: number;
        classificationCounter: {
            label: string;
            value: number
        }[];
        mean: {
            label: string;
            value: number;
        }[];
        standardDeviation: {
            label: string;
            value: number;
        }[];
        metrics: {
            name: string;
            value: number;
        }[];
    };
}

export type MgmtInterfaceImpulseRecordRawData = {
    type: 'wav' | 'jpg',
    bufferBase64: string,
};

export interface MgmtInterfaceImpulseRecord {
    impulseRecord: {
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
        },
        timing: {
            dsp: number;
            classification: number;
            anomaly: number;
        },
    };
    timestamp: number;
    index: number;
    rawData: MgmtInterfaceImpulseRecordRawData;
}

export interface MgmtInterfaceImpulseRecordAck {
    impulseRecordAck: boolean;
    index: number;
    error?: string;
}

export interface MgmtInterfaceInferenceStarted {
    inferenceStarted: boolean;
}

export interface MgmtInterfaceNewModelAvailable {
    newModelAvailable: boolean;
    deploymentVersion: number | 'latest';
}

export type MgmtInterfaceNewModelUpdated = {
    modelUpdateSuccess: true,
    inferenceInfo: MgmtInterfaceInferenceInfo,
} | {
    modelUpdateSuccess: false,
    error: string,
};

export interface MgmtInterfaceImpulseRecordsResponse {
    impulseRecordsResponse: boolean;
    index?: number;
    error?: string;
    record?: {
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
        },
        timing: {
            dsp: number;
            classification: number;
            anomaly: number;
        },
    };
    timestamp?: number;
    rawData?: MgmtInterfaceImpulseRecordRawData;
}

export interface MgmtInterfaceImpulseRecordsRequest {
    impulseRecordRequest: {
        index?: number;
        range?: {
            first: number;
            last: number;
        };
        list?: number[];
    };
}