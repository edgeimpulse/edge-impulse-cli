// tslint:disable-next-line: variable-name, no-var-requires
const PATH = require('path');
// tslint:disable-next-line: no-unsafe-any
module.paths.push(PATH.join(process.cwd(), 'node_modules'));

import {
    AuthApi, CDNApi, ClassifyApi, DSPApi,
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
} from './sdk/api';
import WebSocket from 'ws';

export type EdgeImpulseApiOpts = {
    endpoint?: string;
};

export type EdgeImpulseApiAuthOpts = {
    method: 'apiKey';
    apiKey: string;
} | {
    method: 'jwtToken';
    jwtToken: string;
};

export class EdgeImpulseApi {
    private _opts: { endpoint: string };

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

        this._opts = { endpoint };

        this.admin = new AdminApi(this._opts.endpoint + '/v1');
        this.auth = new AuthApi(this._opts.endpoint + '/v1');
        this.classify = new ClassifyApi(this._opts.endpoint + '/v1');
        this.dsp = new DSPApi(this._opts.endpoint + '/v1');
        this.deployment = new DeploymentApi(this._opts.endpoint + '/v1');
        this.devices = new DevicesApi(this._opts.endpoint + '/v1');
        this.export = new ExportApi(this._opts.endpoint + '/v1');
        this.health = new HealthApi(this._opts.endpoint + '/v1');
        this.impulse = new ImpulseApi(this._opts.endpoint + '/v1');
        this.jobs = new JobsApi(this._opts.endpoint + '/v1');
        this.learn = new LearnApi(this._opts.endpoint + '/v1');
        this.login = new LoginApi(this._opts.endpoint + '/v1');
        this.metrics = new MetricsApi(this._opts.endpoint + '/v1');
        this.optimization = new OptimizationApi(this._opts.endpoint + '/v1');
        this.organizationBlocks = new OrganizationBlocksApi(this._opts.endpoint + '/v1');
        this.organizationCreateProject = new OrganizationCreateProjectApi(this._opts.endpoint + '/v1');
        this.organizationData = new OrganizationDataApi(this._opts.endpoint + '/v1');
        this.organizationJobs = new OrganizationJobsApi(this._opts.endpoint + '/v1');
        this.organizationPipelines = new OrganizationPipelinesApi(this._opts.endpoint + '/v1');
        this.organizationPortals = new OrganizationPortalsApi(this._opts.endpoint + '/v1');
        this.organizations = new OrganizationsApi(this._opts.endpoint + '/v1');
        this.performanceCalibration = new PerformanceCalibrationApi(this._opts.endpoint + '/v1');
        this.projects = new ProjectsApi(this._opts.endpoint + '/v1');
        this.rawData = new RawDataApi(this._opts.endpoint + '/v1');
        this.themes = new ThemesApi(this._opts.endpoint + '/v1');
        this.thirdPartyAuth = new ThirdPartyAuthApi(this._opts.endpoint + '/v1');
        this.uploadPortal = new UploadPortalApi(this._opts.endpoint + '/v1');
        this.user = new UserApi(this._opts.endpoint + '/v1');
        this.whitelabels = new WhitelabelsApi(this._opts.endpoint + '/v1');
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

        let terminated = false;

        // Get a websocket
        const socket = await this.getProjectWebsocket(projectId);

        const connectToSocket = async () => {
            let pingIv = setInterval(() => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.ping();
                    socket.send('2');
                }
            }, 5000);

            socket.onmessage = (msg) => {
                try {
                    let m = JSON.parse(msg.data.toString().replace(/^[0-9]+/, ''));
                    // tslint:disable-next-line: no-unsafe-any
                    if (m[0] !== `job-data-${jobId}` && m[0] !== `job-finished-${jobId}`) return;
                    // tslint:disable-next-line: no-unsafe-any
                    if (m[1].data) {
                        if (dataCallback) {
                            // tslint:disable-next-line: no-unsafe-any
                            dataCallback(m[1].data);
                        }
                    }
                }
                catch (e) {
                    /* noop */
                }
            };

            socket.onclose = () => {
                clearInterval(pingIv);

                if (terminated) return;

                // console.log('Socket closed... connecting to new socket...');

                // tslint:disable-next-line: no-floating-promises
                connectToSocket();
            };

            return socket;
        };

        let s = await connectToSocket();

        while (1) {
            await this.sleep(5000);

            const d = await this.jobs.getJobStatus(projectId, jobId);

            let job = d.job || { finishedSuccessful: undefined };
            if (job.finishedSuccessful === true) {
                break;
            }
            else if (job.finishedSuccessful === false) {
                throw new Error('Job failed');
            }
        }

        terminated = true;

        s.terminate();
    }

    private async getProjectWebsocket(projectId: number) {
        const tokenRes = await this.projects.getSocketToken(projectId);

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
                reject('websocket error: ' + JSON.stringify(err));
            };
            ws.onmessage = msg => {
                try {
                    let m = <any[]>JSON.parse(msg.data.toString().replace(/^[0-9]+/, ''));
                    if (m[0] === 'hello') {
                        // tslint:disable-next-line: no-unsafe-any
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

        let terminated = false;

        // Get a websocket
        const socket = await this.getOrgWebsocket(organizationId);

        const connectToSocket = async () => {

            let pingIv = setInterval(() => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send('2');
                    socket.ping();
                }
            }, 5000);

            socket.onmessage = (msg) => {
                try {
                    let m = JSON.parse(msg.data.toString().replace(/^[0-9]+/, ''));
                    // tslint:disable-next-line: no-unsafe-any
                    if (m[0] !== `job-data-${jobId}` && m[0] !== `job-finished-${jobId}`) return;
                    // tslint:disable-next-line: no-unsafe-any
                    if (m[1].data) {
                        if (dataCallback) {
                            // tslint:disable-next-line: no-unsafe-any
                            dataCallback(m[1].data);
                        }
                    }
                }
                catch (e) {
                    /* noop */
                }
            };

            socket.onclose = () => {
                clearInterval(pingIv);

                if (terminated) return;

                // console.log('Socket closed... connecting to new socket...');

                // tslint:disable-next-line: no-floating-promises
                connectToSocket();
            };

            return socket;
        };

        let s = await connectToSocket();

        while (1) {
            await this.sleep(5000);

            const d = await this.organizationJobs.getOrganizationJobStatus(organizationId, jobId);

            let job = d.job || { finishedSuccessful: undefined };
            if (job.finishedSuccessful === true) {
                break;
            }
            else if (job.finishedSuccessful === false) {
                throw new Error('Job failed');
            }
        }

        terminated = true;

        s.terminate();
    }

    private async getOrgWebsocket(organizationId: number) {
        const tokenRes = await this.organizationJobs.getOrganizationSocketToken(organizationId);

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
                reject('websocket error: ' + JSON.stringify(err));
            };
            ws.onmessage = msg => {
                try {
                    let m = <any[]>JSON.parse(msg.data.toString().replace(/^[0-9]+/, ''));
                    if (m[0] === 'hello') {
                        // tslint:disable-next-line: no-unsafe-any
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

    private async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
