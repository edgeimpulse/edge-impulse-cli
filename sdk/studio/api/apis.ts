export * from './authApi';
import { AuthApi } from './authApi';
export * from './cDNApi';
import { CDNApi } from './cDNApi';
export * from './classifyApi';
import { ClassifyApi } from './classifyApi';
export * from './dSPApi';
import { DSPApi } from './dSPApi';
export * from './deploymentApi';
import { DeploymentApi } from './deploymentApi';
export * from './devicesApi';
import { DevicesApi } from './devicesApi';
export * from './impulseApi';
import { ImpulseApi } from './impulseApi';
export * from './jobsApi';
import { JobsApi } from './jobsApi';
export * from './learnApi';
import { LearnApi } from './learnApi';
export * from './loginApi';
import { LoginApi } from './loginApi';
export * from './projectsApi';
import { ProjectsApi } from './projectsApi';
export * from './rawDataApi';
import { RawDataApi } from './rawDataApi';
export * from './userApi';
import { UserApi } from './userApi';
import * as fs from 'fs';
import * as http from 'http';

export class HttpError extends Error {
    constructor (public response: http.IncomingMessage, public body: any, public statusCode?: number) {
        super('HTTP request failed');
        this.name = 'HttpError';
    }
}

export interface RequestDetailedFile {
    value: Buffer;
    options?: {
        filename?: string;
        contentType?: string;
    }
}

export type RequestFile = string | Buffer | fs.ReadStream | RequestDetailedFile;

export const APIS = [AuthApi, CDNApi, ClassifyApi, DSPApi, DeploymentApi, DevicesApi, ImpulseApi, JobsApi, LearnApi, LoginApi, ProjectsApi, RawDataApi, UserApi];
