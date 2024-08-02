/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-var-requires
const PATH = require('path');
module.paths.push(PATH.join(process.cwd(), 'node_modules'));

import {
    AuthApi, ClassifyApi, DSPApi,
    DeploymentApi, DevicesApi, ExportApi, HealthApi, ImpulseApi, JobsApi, LearnApi, LoginApi,
    OptimizationApi, OrganizationBlocksApi, OrganizationCreateProjectApi,
    OrganizationDataApi, OrganizationJobsApi, OrganizationPipelinesApi, OrganizationPortalsApi,
    OrganizationsApi, ProjectsApi, RawDataApi,
    ThemesApi, UploadPortalApi,
    UserApi,
    WhitelabelsApi,
    ThirdPartyAuthApi,
    AdminApi,
    PerformanceCalibrationApi,
    MetricsApi,
    GetJobResponse,
    SocketTokenResponse,
    OrganizationDataCampaignsApi,
} from './sdk/api';
import WebSocket from 'ws';

const JOB_CONNECTION_TIMEOUT = 60000;

export type EdgeImpulseApiOpts = {
    endpoint?: string;
    debug?: boolean;
    extraHeaders?: { [name: string]: string };
};

export type EdgeImpulseApiAuthOpts = {
    method: 'apiKey';
    apiKey: string;
} | {
    method: 'jwtToken';
    jwtToken: string;
};

const DEBUG_PREFIX = '\x1b[33m[API]\x1b[0m';

export class EdgeImpulseApi {
    private _opts: { endpoint: string, debug: boolean, extraHeaders: { [name: string]: string } };

    admin: AdminApi;
    auth: AuthApi;
    classify: ClassifyApi;
    dsp: DSPApi;
    deployment: DeploymentApi;
    devices: DevicesApi;
    export: ExportApi;
    health: HealthApi;
    impulse: ImpulseApi;
    jobs: JobsApi;
    learn: LearnApi;
    login: LoginApi;
    metrics: MetricsApi;
    optimization: OptimizationApi;
    organizationBlocks: OrganizationBlocksApi;
    organizationCreateProject: OrganizationCreateProjectApi;
    organizationData: OrganizationDataApi;
    organizationDataCampaigns: OrganizationDataCampaignsApi;
    organizationJobs: OrganizationJobsApi;
    organizationPipelines: OrganizationPipelinesApi;
    organizationPortals: OrganizationPortalsApi;
    organizations: OrganizationsApi;
    performanceCalibration: PerformanceCalibrationApi;
    projects: ProjectsApi;
    rawData: RawDataApi;
    themes: ThemesApi;
    thirdPartyAuth: ThirdPartyAuthApi;
    uploadPortal: UploadPortalApi;
    user: UserApi;
    whitelabels: WhitelabelsApi;

    /**
     * Initialize the API
     * @param opts An object with { auth, endpoint }.
     */
    constructor(opts?: EdgeImpulseApiOpts) {
        let endpoint = (opts || { }).endpoint || 'https://studio.edgeimpulse.com';
        if (endpoint.endsWith('/')) {
            endpoint = endpoint.slice(0, endpoint.length - 1);
        }
        if (endpoint.endsWith('/v1')) {
            endpoint = endpoint.slice(0, endpoint.length - 3);
        }

        this._opts = {
            endpoint,
            debug: opts?.debug || false,
            extraHeaders: opts?.extraHeaders || { },
        };

        this.admin = new AdminApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.auth = new AuthApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.classify = new ClassifyApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.dsp = new DSPApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.deployment = new DeploymentApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.devices = new DevicesApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.export = new ExportApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.health = new HealthApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.impulse = new ImpulseApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.jobs = new JobsApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.learn = new LearnApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.login = new LoginApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.metrics = new MetricsApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.optimization = new OptimizationApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.organizationBlocks = new OrganizationBlocksApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.organizationCreateProject = new OrganizationCreateProjectApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.organizationData = new OrganizationDataApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.organizationDataCampaigns = new OrganizationDataCampaignsApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.organizationJobs = new OrganizationJobsApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.organizationPipelines = new OrganizationPipelinesApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.organizationPortals = new OrganizationPortalsApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.organizations = new OrganizationsApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.performanceCalibration = new PerformanceCalibrationApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.projects = new ProjectsApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.rawData = new RawDataApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.themes = new ThemesApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.thirdPartyAuth = new ThirdPartyAuthApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.uploadPortal = new UploadPortalApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.user = new UserApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
        this.whitelabels = new WhitelabelsApi(this._opts.endpoint + '/v1',
            { extraHeaders: this._opts.extraHeaders });
    }

    async authenticate(opts: EdgeImpulseApiAuthOpts) {
        if (!opts || !(opts instanceof Object)) {
            throw new Error('Missing auth object as first argument to `authenticate`');
        }
        if (opts.method === 'apiKey') {
            if (!opts.apiKey || typeof opts.apiKey !== 'string') {
                throw new Error('Missing "auth.apiKey"');
            }
            if (!opts.apiKey.startsWith('ei_')) {
                throw new Error('"auth.apiKey" should start with "ei_"');
            }
        }
        else if (opts.method === 'jwtToken') {
            if (!opts.jwtToken || typeof opts.jwtToken !== 'string') {
                throw new Error('Missing "auth.jwtToken"');
            }
        }
        else {
            throw new Error('Invalid value for "auth.method", should be apiKey or jwtToken');
        }

        const jwtTokenAuthId = 2; // JWT Token header
        const apiKeyAuthId = 0; // API Key header

        if (opts.method === 'apiKey') {
            this.admin.setApiKey(apiKeyAuthId, opts.apiKey);
            this.auth.setApiKey(apiKeyAuthId, opts.apiKey);
            this.classify.setApiKey(apiKeyAuthId, opts.apiKey);
            this.dsp.setApiKey(apiKeyAuthId, opts.apiKey);
            this.deployment.setApiKey(apiKeyAuthId, opts.apiKey);
            this.devices.setApiKey(apiKeyAuthId, opts.apiKey);
            this.export.setApiKey(apiKeyAuthId, opts.apiKey);
            this.impulse.setApiKey(apiKeyAuthId, opts.apiKey);
            this.jobs.setApiKey(apiKeyAuthId, opts.apiKey);
            this.learn.setApiKey(apiKeyAuthId, opts.apiKey);
            this.optimization.setApiKey(apiKeyAuthId, opts.apiKey);
            this.organizationBlocks.setApiKey(apiKeyAuthId, opts.apiKey);
            this.organizationCreateProject.setApiKey(apiKeyAuthId, opts.apiKey);
            this.organizationData.setApiKey(apiKeyAuthId, opts.apiKey);
            this.organizationDataCampaigns.setApiKey(apiKeyAuthId, opts.apiKey);
            this.organizationJobs.setApiKey(apiKeyAuthId, opts.apiKey);
            this.organizationPipelines.setApiKey(apiKeyAuthId, opts.apiKey);
            this.organizationPortals.setApiKey(apiKeyAuthId, opts.apiKey);
            this.organizations.setApiKey(apiKeyAuthId, opts.apiKey);
            this.performanceCalibration.setApiKey(apiKeyAuthId, opts.apiKey);
            this.projects.setApiKey(apiKeyAuthId, opts.apiKey);
            this.rawData.setApiKey(apiKeyAuthId, opts.apiKey);
            this.themes.setApiKey(apiKeyAuthId, opts.apiKey);
            this.thirdPartyAuth.setApiKey(apiKeyAuthId, opts.apiKey);
            this.uploadPortal.setApiKey(apiKeyAuthId, opts.apiKey);
            this.user.setApiKey(apiKeyAuthId, opts.apiKey);
            this.whitelabels.setApiKey(apiKeyAuthId, opts.apiKey);

            this.admin.setApiKey(jwtTokenAuthId, undefined);
            this.auth.setApiKey(jwtTokenAuthId, undefined);
            this.classify.setApiKey(jwtTokenAuthId, undefined);
            this.dsp.setApiKey(jwtTokenAuthId, undefined);
            this.deployment.setApiKey(jwtTokenAuthId, undefined);
            this.devices.setApiKey(jwtTokenAuthId, undefined);
            this.export.setApiKey(jwtTokenAuthId, undefined);
            this.impulse.setApiKey(jwtTokenAuthId, undefined);
            this.jobs.setApiKey(jwtTokenAuthId, undefined);
            this.learn.setApiKey(jwtTokenAuthId, undefined);
            this.optimization.setApiKey(jwtTokenAuthId, undefined);
            this.organizationBlocks.setApiKey(jwtTokenAuthId, undefined);
            this.organizationCreateProject.setApiKey(jwtTokenAuthId, undefined);
            this.organizationData.setApiKey(jwtTokenAuthId, undefined);
            this.organizationDataCampaigns.setApiKey(jwtTokenAuthId, undefined);
            this.organizationJobs.setApiKey(jwtTokenAuthId, undefined);
            this.organizationPipelines.setApiKey(jwtTokenAuthId, undefined);
            this.organizationPortals.setApiKey(jwtTokenAuthId, undefined);
            this.organizations.setApiKey(jwtTokenAuthId, undefined);
            this.performanceCalibration.setApiKey(jwtTokenAuthId, undefined);
            this.projects.setApiKey(jwtTokenAuthId, undefined);
            this.rawData.setApiKey(jwtTokenAuthId, undefined);
            this.themes.setApiKey(jwtTokenAuthId, undefined);
            this.thirdPartyAuth.setApiKey(jwtTokenAuthId, undefined);
            this.uploadPortal.setApiKey(jwtTokenAuthId, undefined);
            this.user.setApiKey(jwtTokenAuthId, undefined);
            this.whitelabels.setApiKey(jwtTokenAuthId, undefined);
        }
        else {
            let jwtToken = opts.jwtToken;

            this.admin.setApiKey(jwtTokenAuthId, jwtToken);
            this.auth.setApiKey(jwtTokenAuthId, jwtToken);
            this.classify.setApiKey(jwtTokenAuthId, jwtToken);
            this.dsp.setApiKey(jwtTokenAuthId, jwtToken);
            this.deployment.setApiKey(jwtTokenAuthId, jwtToken);
            this.devices.setApiKey(jwtTokenAuthId, jwtToken);
            this.export.setApiKey(jwtTokenAuthId, jwtToken);
            this.impulse.setApiKey(jwtTokenAuthId, jwtToken);
            this.jobs.setApiKey(jwtTokenAuthId, jwtToken);
            this.learn.setApiKey(jwtTokenAuthId, jwtToken);
            this.optimization.setApiKey(jwtTokenAuthId, jwtToken);
            this.organizationBlocks.setApiKey(jwtTokenAuthId, jwtToken);
            this.organizationCreateProject.setApiKey(jwtTokenAuthId, jwtToken);
            this.organizationData.setApiKey(jwtTokenAuthId, jwtToken);
            this.organizationDataCampaigns.setApiKey(jwtTokenAuthId, jwtToken);
            this.organizationJobs.setApiKey(jwtTokenAuthId, jwtToken);
            this.organizationPipelines.setApiKey(jwtTokenAuthId, jwtToken);
            this.organizationPortals.setApiKey(jwtTokenAuthId, jwtToken);
            this.organizations.setApiKey(jwtTokenAuthId, jwtToken);
            this.performanceCalibration.setApiKey(jwtTokenAuthId, jwtToken);
            this.projects.setApiKey(jwtTokenAuthId, jwtToken);
            this.rawData.setApiKey(jwtTokenAuthId, jwtToken);
            this.themes.setApiKey(jwtTokenAuthId, jwtToken);
            this.thirdPartyAuth.setApiKey(jwtTokenAuthId, jwtToken);
            this.uploadPortal.setApiKey(jwtTokenAuthId, jwtToken);
            this.user.setApiKey(jwtTokenAuthId, jwtToken);
            this.whitelabels.setApiKey(jwtTokenAuthId, jwtToken);

            this.admin.setApiKey(apiKeyAuthId, undefined);
            this.auth.setApiKey(apiKeyAuthId, undefined);
            this.classify.setApiKey(apiKeyAuthId, undefined);
            this.dsp.setApiKey(apiKeyAuthId, undefined);
            this.deployment.setApiKey(apiKeyAuthId, undefined);
            this.devices.setApiKey(apiKeyAuthId, undefined);
            this.export.setApiKey(apiKeyAuthId, undefined);
            this.impulse.setApiKey(apiKeyAuthId, undefined);
            this.jobs.setApiKey(apiKeyAuthId, undefined);
            this.learn.setApiKey(apiKeyAuthId, undefined);
            this.optimization.setApiKey(apiKeyAuthId, undefined);
            this.organizationBlocks.setApiKey(apiKeyAuthId, undefined);
            this.organizationCreateProject.setApiKey(apiKeyAuthId, undefined);
            this.organizationData.setApiKey(apiKeyAuthId, undefined);
            this.organizationDataCampaigns.setApiKey(apiKeyAuthId, undefined);
            this.organizationJobs.setApiKey(apiKeyAuthId, undefined);
            this.organizationPipelines.setApiKey(apiKeyAuthId, undefined);
            this.organizationPortals.setApiKey(apiKeyAuthId, undefined);
            this.organizations.setApiKey(apiKeyAuthId, undefined);
            this.performanceCalibration.setApiKey(apiKeyAuthId, undefined);
            this.projects.setApiKey(apiKeyAuthId, undefined);
            this.rawData.setApiKey(apiKeyAuthId, undefined);
            this.themes.setApiKey(apiKeyAuthId, undefined);
            this.thirdPartyAuth.setApiKey(apiKeyAuthId, undefined);
            this.uploadPortal.setApiKey(apiKeyAuthId, undefined);
            this.user.setApiKey(apiKeyAuthId, undefined);
            this.whitelabels.setApiKey(apiKeyAuthId, undefined);
        }
    }

    async runJobUntilCompletion(opts: {
        type: 'project',
        projectId: number,
        jobId: number,
    } | {
        type: 'organization',
        organizationId: number,
        jobId: number,
    }, dataCallback?: (ev: string) => void) {
        if (typeof opts !== 'object') {
            throw new Error('Missing options object');
        }

        if (opts.type === 'project') {
            return this.runProjectJobUntilCompletion(opts, dataCallback);
        }
        else if (opts.type === 'organization') {
            return this.runOrgJobUntilCompletion(opts, dataCallback);
        }
        else {
            throw new Error('options.type should be either "project" or "organization"');
        }
    }

    private async runProjectJobUntilCompletion(opts: {
        projectId: number,
        jobId: number,
    }, dataCallback?: (ev: string) => void) {

        if (typeof opts !== 'object') {
            throw new Error('Missing options object');
        }
        if (typeof opts.projectId !== 'number') {
            throw new Error('Missing "projectId"');
        }
        if (typeof opts.jobId !== 'number') {
            throw new Error('Missing "jobId"');
        }

        const { projectId, jobId } = opts;

        return this.waitForJobImpl(
            jobId,
            dataCallback,
            () => this.getProjectWebsocket(projectId),
            async () => {
                const d = await this.jobs.getJobStatus(projectId, jobId);
                if (this._opts.debug) {
                    console.log(DEBUG_PREFIX, 'runJobUntilCompletion', 'projectId', projectId, 'jobId', jobId,
                        'status', d);
                }
                return d;
            }
        );
    }

    private async getProjectWebsocket(projectId: number) {
        const tokenRes = await this.projects.getSocketToken(projectId);

        return this.getWebsocketImpl(tokenRes);
    }

    private async runOrgJobUntilCompletion(opts: {
        organizationId: number,
        jobId: number,
    }, dataCallback?: (ev: string) => void) {

        if (typeof opts !== 'object') {
            throw new Error('Missing options object');
        }
        if (typeof opts.organizationId !== 'number') {
            throw new Error('Missing "organizationId"');
        }
        if (typeof opts.jobId !== 'number') {
            throw new Error('Missing "jobId"');
        }

        const { organizationId, jobId } = opts;

        return this.waitForJobImpl(
            jobId,
            dataCallback,
            () => this.getOrgWebsocket(organizationId),
            async () => {
                const d = await this.organizationJobs.getOrganizationJobStatus(organizationId, jobId);
                if (this._opts.debug) {
                    console.log(DEBUG_PREFIX, 'runJobUntilCompletion', 'organizationId', organizationId,
                        'jobId', jobId,
                        'status', d);
                }
                return d;
            }
        );
    }

    private async getOrgWebsocket(organizationId: number) {
        const tokenRes = await this.organizationJobs.getOrganizationSocketToken(organizationId);
        return this.getWebsocketImpl(tokenRes);
    }

    private async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async waitForJobImpl(jobId: number,
                                 dataCallback: ((ev: string) => void) | undefined,
                                 getWebsocketFn: () => Promise<WebSocket>,
                                 getJobStatusFn: () => Promise<GetJobResponse>) {
        let terminated = false;

        const connectToSocket = async () => {
            let socket!: WebSocket;

            // Get a websocket (max 60 sec timeout)
            let getWebsocketTimeout = Date.now() + JOB_CONNECTION_TIMEOUT;
            while (1) {
                try {
                    socket = await getWebsocketFn();
                    if (dataCallback) {
                        dataCallback('Connected to job\n');
                    }
                    break;
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    if (Date.now() > getWebsocketTimeout) {
                        throw ex;
                    }

                    if (this._opts.debug) {
                        console.log(DEBUG_PREFIX, 'Failed to get socket token, retrying in 5 seconds...');
                    }
                    if (dataCallback) {
                        dataCallback(`Failed to connect to job (${ex.message || ex.toString()}), retrying in 5 seconds...\n`);
                    }
                    await this.sleep(5000);
                }
            }

            let pingIv = setInterval(() => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.ping();
                    socket.send('2');
                }
            }, 5000);

            socket.onmessage = (msg) => {
                try {
                    let m = JSON.parse(msg.data.toString().replace(/^[0-9]+/, ''));
                    if (m[0] !== `job-data-${jobId}` && m[0] !== `job-finished-${jobId}`) return;
                    if (m[1].data) {
                        if (dataCallback) {
                            dataCallback(m[1].data);
                        }
                    }
                }
                catch (e) {
                    /* noop */
                }
            };
            // eslint-disable-next-line
            socket.onclose = async () => {
                clearInterval(pingIv);

                if (terminated) return;

                if (dataCallback) {
                    dataCallback('Lost connection to job, retrying to connect...\n');
                }

                try {
                    await connectToSocket();
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    if (dataCallback) {
                        dataCallback(`Failed to open new socket (${ex.message || ex.toString()}\n`);
                    }
                }
            };

            return socket;
        };

        let s = await connectToSocket();

        let lastJobStatusReqSucceeded = Date.now();

        while (1) {
            await this.sleep(5000);

            let jobHasFailed = false;

            try {
                const d = await getJobStatusFn();
                lastJobStatusReqSucceeded = Date.now();

                let job = d.job || { finishedSuccessful: undefined };
                if (job.finishedSuccessful === true) {
                    break;
                }
                else if (job.finishedSuccessful === false) {
                    jobHasFailed = true;
                }
            }
            catch (ex2) {
                let ex = <Error>ex2;

                if (this._opts.debug) {
                    console.log(DEBUG_PREFIX, 'Failed to check job status', ex.message || ex.toString());
                }

                if (Date.now() - lastJobStatusReqSucceeded > JOB_CONNECTION_TIMEOUT) {
                    throw new Error('Failed to check job status for 60 seconds: ' +
                        (ex.message || ex.toString()));
                }
            }

            if (jobHasFailed) {
                throw new Error('Job failed');
            }
        }

        terminated = true;

        s.terminate();
    }

    private async getWebsocketImpl(tokenRes: SocketTokenResponse) {
        const wsHost = this._opts.endpoint.replace('http', 'ws');

        let tokenData = {
            success: true,
            token: tokenRes.token || { socketToken: '' },
        };

        let ws = new WebSocket(wsHost + '/socket.io/?token=' +
            tokenData.token.socketToken + '&EIO=3&transport=websocket');

        return new Promise<WebSocket>((resolve, reject) => {
            ws.onclose = () => {
                reject('websocket was closed');
            };
            ws.onerror = err => {
                reject('websocket error: ' + err);
            };
            ws.onmessage = msg => {
                try {
                    let m = <any[]>JSON.parse(msg.data.toString().replace(/^[0-9]+/, ''));
                    if (m[0] === 'hello') {
                        if (m[1].hello && m[1].hello.version === 1) {
                            clearTimeout(rejectTimeout);
                            // console.log('Connected to job websocket');
                            resolve(ws);
                        }
                        else {
                            reject(JSON.stringify(m[1]));
                        }
                    }
                }
                catch (ex) {
                    /* noop */
                }
            };

            let rejectTimeout = setTimeout(() => {
                reject('Did not authenticate with the websocket API within 10 seconds');
            }, 10000);
        });
    }
}
