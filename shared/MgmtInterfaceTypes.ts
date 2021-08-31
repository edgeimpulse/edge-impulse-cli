import { ClientConnectionType } from "./viewmodels/init";

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

export interface MgmtInterfaceHelloResponse {
    hello: boolean;
    err?: string;
    auth?: boolean;
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

export interface MgmtInterfaceStartSnapshotRequest {
    startSnapshot: boolean;
}

export interface MgmtInterfaceStopSnapshotRequest {
    stopSnapshot: boolean;
}

export interface MgmtInterfaceSnapshotStartedResponse {
    snapshotStarted: boolean;
}

export interface MgmtInterfaceSnapshotStoppedResponse {
    snapshotStopped: boolean;
}

export interface MgmtInterfaceSnapshotFailedResponse {
    snapshotFailed: boolean;
    error: string;
}

export interface MgmtInterfaceSnapshotResponse {
    snapshotFrame: string;
    fileName: string;
}
