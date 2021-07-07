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
    Upload = 24,
    Versions = 25,
    Restore = 26,
    Evaluate = 27,
    Tuner = 28,
    LabelObjectDetection = 29,
    SelectProjectThirdParty = 30,
    OrganizationDashboard = 90,
    OrganizationUsers = 91,
    OrganizationKeys = 92,
    OrganizationBuckets = 93,
    OrganizationData = 94,
    OrganizationCreateProject = 95,
    OrganizationTransformation = 96,
    OrganizationCreateProjectDetails = 97,
    OrganizationCreateProjectList = 98,
    OrganizationProjects = 99,
    OrganizationDeploy = 100,
    OrganizationPortals = 101,
    UploadPortal = 200,
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
    deviceType: string;
    deviceName: string;
    supportsSnapshotStreaming: boolean;
}

export interface ClientStudioWebsocketHello {
    hello: { version: number };
    devices: ClientConnectedDevice[];
    activeTunerJobId?: number;
}

export interface ClientInitUser {
    id: number;
    name: string;
    photo?: string;
}

export interface ClientInitStudioOptions {
    pageType: PageType;
    gaId: string;
    userId: number;
    projectId: number;
    baseUrl: string;
    projectName: string;
    socketToken: string;
    connectedDevices: ClientConnectedDevice[];
    staticAssetsPrefix: string;
    sentryDSN?: string;
    sentryEnvironment?: string;
    errorPage: boolean;
    gitCommitHash: string;
    isAdmin: boolean;
    isObjectDetection: boolean;
    user: ClientInitUser | undefined;
}

export interface ClientInitOrganizationOptions {
    pageType: PageType;
    gaId: string;
    userId: number;
    organizationId: number;
    socketToken: string;
    staticAssetsPrefix: string;
    baseUrl: string;
    sentryDSN?: string;
    sentryEnvironment?: string;
    errorPage: boolean;
    user: ClientInitUser | undefined;
}

export interface ClientInitOrganizationPortalOptions {
    pageType: PageType;
    portalId: number;
    baseUrl: string;
    gaId: string;
    staticAssetsPrefix: string;
    sentryDSN?: string;
    sentryEnvironment?: string;
    errorPage: boolean;
    authToken: string;
}

export interface ClientInitFormOptions {
    pageType: PageType;
    gaId: string;
    userId: number;
    staticAssetsPrefix: string;
    sentryDSN?: string;
    sentryEnvironment?: string;
    user: ClientInitUser | undefined;
}

export interface ClientInitPublicOptions {
    pageType: PageType;
    gaId: string;
    staticAssetsPrefix: string;
    sentryDSN?: string;
    sentryEnvironment?: string;
}

export interface OrganizationWebsocketHello {
    hello: { version: number };
}
