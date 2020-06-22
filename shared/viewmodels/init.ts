export enum PageType {
    Device = 0,
    Acquisition = 1,
    DSP = 2,
    TrainingKeras = 3,
    FeatureGeneration = 4,
    Classification = 5,
    Deployment = 6,
    SelectProject = 7,
    ProjectDashboard = 8,
    CreateImpulse = 9,
    TrainingAnomaly = 10,
    Retrain = 11,
    ModelValidation = 12,
    SignupSuccessful = 13,
    AccountActivation = 14,
    PasswordResetSuccessful = 15,
    Profile = 16,
    Keys = 17,
    Login = 18,
    Signup = 19,
    ForgotPassword = 20,
    ForgotPasswordSuccessful = 21,
    ResetPassword = 22,
    Export = 23,
    OrganizationDashboard = 90,
    OrganizationUsers = 91,
    OrganizationKeys = 92,
    OrganizationBuckets = 93,
    OrganizationData = 94,
    OrganizationCreateProject = 95,
    OrganizationTransformation = 96,
    OrganizationCreateProjectDetails = 97,
    OrganizationCreateProjectList = 98,
}

export type ClientConnectionType = 'ip' | 'daemon';

export interface ClientConnectedDevice {
    deviceId: string;
    connection: ClientConnectionType;
    sensors: {
        name: string;
        maxSampleLengthS: number;
        frequencies: number[];
    }[];
}

export interface ClientStudioWebsocketHello {
    hello: { version: number };
    devices: ClientConnectedDevice[];
}

export interface ClientInitStudioOptions {
    pageType: PageType;
    gaId: string;
    userId: number;
    projectId: number;
    socketToken: string;
    connectedDevices: ClientConnectedDevice[];
    staticAssetsPrefix: string;
    sentryDSN?: string;
    sentryEnvironment?: string;
    errorPage: boolean;
}

export interface ClientInitOrganizationOptions {
    pageType: PageType;
    gaId: string;
    userId: number;
    organizationId: number;
    socketToken: string;
    staticAssetsPrefix: string;
    sentryDSN?: string;
    sentryEnvironment?: string;
    errorPage: boolean;
}

export interface ClientInitFormOptions {
    pageType: PageType;
    gaId: string;
    userId: number;
    staticAssetsPrefix: string;
    sentryDSN?: string;
    sentryEnvironment?: string;
}

export interface ClientInitPublicOptions {
    pageType: PageType;
    gaId: string;
    staticAssetsPrefix: string;
    sentryDSN?: string;
    sentryEnvironment?: string;
}
