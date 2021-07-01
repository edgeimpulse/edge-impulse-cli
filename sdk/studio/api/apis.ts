export * from './adminApi';
import { AdminApi } from './adminApi';
export * from './allowsReadOnlyApi';
import { AllowsReadOnlyApi } from './allowsReadOnlyApi';
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
export * from './exportApi';
import { ExportApi } from './exportApi';
export * from './healthApi';
import { HealthApi } from './healthApi';
export * from './impulseApi';
import { ImpulseApi } from './impulseApi';
export * from './jobsApi';
import { JobsApi } from './jobsApi';
export * from './learnApi';
import { LearnApi } from './learnApi';
export * from './loginApi';
import { LoginApi } from './loginApi';
export * from './optimizationApi';
import { OptimizationApi } from './optimizationApi';
export * from './organizationBlocksApi';
import { OrganizationBlocksApi } from './organizationBlocksApi';
export * from './organizationCreateProjectApi';
import { OrganizationCreateProjectApi } from './organizationCreateProjectApi';
export * from './organizationDataApi';
import { OrganizationDataApi } from './organizationDataApi';
export * from './organizationJobsApi';
import { OrganizationJobsApi } from './organizationJobsApi';
export * from './organizationPortalsApi';
import { OrganizationPortalsApi } from './organizationPortalsApi';
export * from './organizationRequiresAdminApi';
import { OrganizationRequiresAdminApi } from './organizationRequiresAdminApi';
export * from './organizationsApi';
import { OrganizationsApi } from './organizationsApi';
export * from './projectsApi';
import { ProjectsApi } from './projectsApi';
export * from './rawDataApi';
import { RawDataApi } from './rawDataApi';
export * from './requiresSudoApi';
import { RequiresSudoApi } from './requiresSudoApi';
export * from './requiresThirdPartyAuthApiKeyApi';
import { RequiresThirdPartyAuthApiKeyApi } from './requiresThirdPartyAuthApiKeyApi';
export * from './supportsRangeApi';
import { SupportsRangeApi } from './supportsRangeApi';
export * from './thirdPartyAuthApi';
import { ThirdPartyAuthApi } from './thirdPartyAuthApi';
export * from './uploadPortalApi';
import { UploadPortalApi } from './uploadPortalApi';
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

export const APIS = [AdminApi, AllowsReadOnlyApi, AuthApi, CDNApi, ClassifyApi, DSPApi, DeploymentApi, DevicesApi, ExportApi, HealthApi, ImpulseApi, JobsApi, LearnApi, LoginApi, OptimizationApi, OrganizationBlocksApi, OrganizationCreateProjectApi, OrganizationDataApi, OrganizationJobsApi, OrganizationPortalsApi, OrganizationRequiresAdminApi, OrganizationsApi, ProjectsApi, RawDataApi, RequiresSudoApi, RequiresThirdPartyAuthApiKeyApi, SupportsRangeApi, ThirdPartyAuthApi, UploadPortalApi, UserApi];
