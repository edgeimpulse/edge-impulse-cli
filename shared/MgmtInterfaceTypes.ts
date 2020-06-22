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

export interface MgmtInterfaceHelloResponse {
    hello: boolean;
    err?: string;
    auth?: boolean;
}

export interface MgmtInterfaceSampleRequest {
    sample: {
        label: string;
        length: number;
        path: string;
        hmacKey: string;
        interval: number;
        sensor?: string;
    };
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
