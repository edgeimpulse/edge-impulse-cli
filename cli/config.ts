import os from 'os';
import Path from 'path';
import fs from 'fs';
import util from 'util';
import inquirer from 'inquirer';
import { ips } from './get-ips';
import {
    LoginApi,
    DevicesApi, DevicesApiApiKeys,
    ProjectsApi, ProjectsApiApiKeys,
    OrganizationsApi, OrganizationsApiApiKeys,
    OrganizationCreateProjectApi, OrganizationCreateProjectApiApiKeys,
    OrganizationJobsApi, OrganizationJobsApiApiKeys, OrganizationBlocksApi,
    OrganizationBlocksApiApiKeys, DeploymentApi, ImpulseApi, LearnApi,
    JobsApi, ImpulseApiApiKeys, LearnApiApiKeys, JobsApiApiKeys, DeploymentApiApiKeys
} from '../sdk/studio/api';

const PREFIX = '\x1b[34m[CFG]\x1b[0m';

export interface SerialConfig {
    host: string;
    jwtToken: string;
    uploaderProjectId: number | undefined;
    lastVersionCheck: number;
    apiKey: string | undefined;
    dataForwarderDevices: {
        [deviceId: string]: {
            apiKey: string,
            hmacKey: string,
            projectId: number,
            samplingFreq: number,
            sensors: string[]
        }
    };
    daemonDevices: {
        [deviceId: string]: {
            projectId: number;
        }
    };
    linuxProjectId: number | undefined;
    camera: string | undefined;
    audio: string | undefined;
}

export interface EdgeImpulseAPI {
    login: LoginApi;
    devices: DevicesApi;
    projects: ProjectsApi;
    impulse: ImpulseApi;
    learn: LearnApi;
    jobs: JobsApi;
    deploy: DeploymentApi;
    organizations: OrganizationsApi;
    organizationCreateProject: OrganizationCreateProjectApi;
    organizationBlocks: OrganizationBlocksApi;
    organizationJobs: OrganizationJobsApi;
}

export interface EdgeImpulseEndpoints {
    internal: {
        ws: string;
        api: string;
        apiWs: string;
        ingestion: string;
    };
    device: {
        ws: string;
        api: string;
        ingestion: string;
    };
}

export interface EdgeImpulseConfig {
    api: EdgeImpulseAPI;
    endpoints: EdgeImpulseEndpoints;
    setDeviceUpload: boolean;
}

export class Config {
    /**
     * Whether a file exists (Node.js API cannot be converted using promisify)
     * @param path
     */
    static async exists(path: string) {
        let exists = false;
        try {
            await util.promisify(fs.stat)(path);
            exists = true;
        }
        catch (ex) {
            /* noop */
        }
        return exists;
    }

    private _filename: string;
    private _api: EdgeImpulseAPI | undefined;
    private _endpoints: EdgeImpulseEndpoints | undefined;
    private _configured = false;

    constructor() {
        this._filename = Path.join(os.homedir(), 'edge-impulse-config.json');
    }

    /**
     * Clean the configuration
     */
    async clean() {
        if (await Config.exists(this._filename)) {
            await util.promisify(fs.unlink)(this._filename);
        }
    }

    async getUploaderProjectId() {
        let config = await this.load();
        if (!config) {
            return undefined;
        }
        return config.uploaderProjectId;
    }

    async setUploaderProjectId(projectId: number) {
        let config = await this.load();
        config.uploaderProjectId = projectId;
        await this.store(config);
    }

    async getLinuxProjectId() {
        let config = await this.load();
        if (!config) {
            return undefined;
        }
        return config.linuxProjectId;
    }

    async setLinuxProjectId(projectId: number) {
        let config = await this.load();
        config.linuxProjectId = projectId;
        await this.store(config);
    }

    async getLastVersionCheck() {
        let config = await this.load();
        if (!config) {
            return Date.now(); // just installed, it's fine
        }
        return config.lastVersionCheck || Date.now();
    }

    async setLastVersionCheck() {
        let config = await this.load();
        config.lastVersionCheck = Date.now();
        await this.store(config);
    }

    /**
     * Verify that a user has configured the host and was logged in
     */
    async verifyLogin(devMode: boolean, apiKey?: string, verifyType: 'org' | 'project' = 'project')
        : Promise<EdgeImpulseConfig> {
        let config = await this.load();

        if (process.env.EI_HOST && config.host !== process.env.EI_HOST) {
            config.host = process.env.EI_HOST;
            config.jwtToken = '';
        }

        let setDeviceUpload = true;

        // no host? ask the user where to connect
        if (!config.host) {
            if (devMode) {
                let hostRes = <{ host: string}>await inquirer.prompt([{
                    type: 'list',
                    choices: [
                        { name: 'edgeimpulse.com (Production)', value: 'edgeimpulse.com' },
                        { name: 'acc1.edgeimpulse.com (Acceptance 1)', value: 'acc1.edgeimpulse.com' },
                        { name: 'acc2.edgeimpulse.com (Acceptance 2)', value: 'acc2.edgeimpulse.com' },
                        { name: 'localhost', value: 'localhost' },
                        { name: 'edgeimpulse.test', value: 'edgeimpulse.test' },
                    ],
                    name: 'host',
                    message: 'To which server do you want to connect? ' +
                        '(you can override this by setting EI_HOST environmental variable)',
                    pageSize: 20
                }]);
                config.host = hostRes.host;
                config.jwtToken = '';
            }
            else {
                config.host = 'edgeimpulse.com';
                config.jwtToken = '';
            }
        }

        let host = config.host;
        let isLocalhost = host === 'localhost';

        if (host === 'localhost' && ips.length === 0) {
            console.warn('Cannot set device upload host and ingestion settings, ' +
                'host is set to localhost and no public IP available. ' +
                'Please set EI_HOST environmental variable.');
            setDeviceUpload = false;
        }
        else if (host === 'localhost') {
            host = ips[0].address;
        }

        const hostIsIP = host === 'localhost' ||
            host === 'host.docker.internal' ||
            /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
        const hostIsHttps = !hostIsIP;

        const wsProtocol = hostIsHttps ? 'wss' : 'ws';
        const httpProtocol = hostIsHttps ? 'https' : 'http';

        // so... we have internal endpoints (used by the daemon) and external endpoints (used by the device)
        // the device does not have TLS configured right now... So we need to always use the HTTP/WS endpoints there...
        const wsEndpointExternal = hostIsIP ? `ws://${host}:4802` : `ws://remote-mgmt.${host}`;
        const ingestionEndpointExternal = hostIsIP ? `http://${host}:4810` : `http://ingestion.${host}`;
        // api endpoint is not called from device, so use HTTPS there
        let apiEndpointExternal = hostIsIP ? `${httpProtocol}://${host}:4800` : `${httpProtocol}://studio.${host}`;
        let apiWspointExternal = hostIsIP ? `${wsProtocol}://${host}:4800` : `${wsProtocol}://studio.${host}`;

        // internal endpoints
        let apiEndpointInternal = isLocalhost ? 'http://localhost:4800' : apiEndpointExternal;
        let apiWsEndpointInternal = isLocalhost ? 'ws://localhost:4800' : apiWspointExternal;
        const wsEndpointInternal = isLocalhost
            ? 'ws://localhost:4802'
            : (hostIsIP ? `${wsProtocol}://${host}:4802` : `${wsProtocol}://remote-mgmt.${host}`);
        const ingestionEndpointInternal = isLocalhost ?
            'http://localhost:4810'
            : hostIsIP ? `${httpProtocol}://${host}:4810` : `${httpProtocol}://ingestion.${host}`;

        apiEndpointInternal += '/v1';
        apiEndpointExternal += '/v1';

        this._api = {
            login: new LoginApi(apiEndpointInternal),
            devices: new DevicesApi(apiEndpointInternal),
            projects: new ProjectsApi(apiEndpointInternal),
            impulse: new ImpulseApi(apiEndpointInternal),
            learn: new LearnApi(apiEndpointInternal),
            jobs: new JobsApi(apiEndpointInternal),
            deploy: new DeploymentApi(apiEndpointInternal),
            organizations: new OrganizationsApi(apiEndpointInternal),
            organizationCreateProject: new OrganizationCreateProjectApi(apiEndpointInternal),
            organizationBlocks: new OrganizationBlocksApi(apiEndpointInternal),
            organizationJobs: new OrganizationJobsApi(apiEndpointInternal),
        };

        this._endpoints = {
            device: {
                ws: wsEndpointExternal,
                api: apiEndpointExternal,
                ingestion: ingestionEndpointExternal
            },
            internal: {
                ws: wsEndpointInternal,
                api: apiEndpointInternal,
                apiWs: apiWsEndpointInternal,
                ingestion: ingestionEndpointInternal
            }
        };

        if (apiKey) {
            // try and authenticate...
            this._api.devices.setApiKey(DevicesApiApiKeys.ApiKeyAuthentication, apiKey);
            this._api.projects.setApiKey(ProjectsApiApiKeys.ApiKeyAuthentication, apiKey);
            this._api.impulse.setApiKey(ImpulseApiApiKeys.ApiKeyAuthentication, apiKey);
            this._api.learn.setApiKey(LearnApiApiKeys.ApiKeyAuthentication, apiKey);
            this._api.jobs.setApiKey(JobsApiApiKeys.ApiKeyAuthentication, apiKey);
            this._api.deploy.setApiKey(DeploymentApiApiKeys.ApiKeyAuthentication, apiKey);
            this._api.organizations.setApiKey(OrganizationsApiApiKeys.ApiKeyAuthentication, apiKey);
            this._api.organizationCreateProject.setApiKey(OrganizationCreateProjectApiApiKeys.ApiKeyAuthentication,
                apiKey);
            this._api.organizationBlocks.setApiKey(OrganizationBlocksApiApiKeys.ApiKeyAuthentication, apiKey);
            this._api.organizationJobs.setApiKey(OrganizationJobsApiApiKeys.ApiKeyAuthentication, apiKey);
            config.apiKey = apiKey;
        }
        else {
            if (!config.jwtToken) {
                let inq = <{ username: string, password: string }>await inquirer.prompt([{
                    type: 'input',
                    name: 'username',
                    message: `What is your user name or e-mail address (${host})?`
                }, {
                    type: 'password',
                    name: 'password',
                    message: `What is your password?`
                }]);

                let res = (await this._api.login.login({
                    username: inq.username,
                    password: inq.password
                })).body;

                if (!res.success || !res.token) {
                    throw new Error('Failed to login: ' + res.error);
                }

                config.jwtToken = res.token;
            }

            // try and authenticate...
            this._api.devices.setApiKey(DevicesApiApiKeys.JWTAuthentication, config.jwtToken);
            this._api.projects.setApiKey(ProjectsApiApiKeys.JWTAuthentication, config.jwtToken);
            this._api.impulse.setApiKey(ImpulseApiApiKeys.JWTAuthentication, config.jwtToken);
            this._api.learn.setApiKey(LearnApiApiKeys.JWTAuthentication, config.jwtToken);
            this._api.jobs.setApiKey(JobsApiApiKeys.JWTAuthentication, config.jwtToken);
            this._api.deploy.setApiKey(DeploymentApiApiKeys.JWTAuthentication, config.jwtToken);
            this._api.organizations.setApiKey(OrganizationsApiApiKeys.JWTAuthentication, config.jwtToken);
            this._api.organizationCreateProject.setApiKey(OrganizationCreateProjectApiApiKeys.JWTAuthentication,
                config.jwtToken);
            this._api.organizationBlocks.setApiKey(OrganizationBlocksApiApiKeys.JWTAuthentication,
                config.jwtToken);
            this._api.organizationJobs.setApiKey(OrganizationJobsApiApiKeys.JWTAuthentication, config.jwtToken);
        }

        if (verifyType === 'project') {
            let projects = await this._api.projects.listProjects();
            if (!projects.body.success) {
                throw new Error('Invalid JWT token, cannot retrieve projects: ' + projects.body.error);
            }
        }
        else {
            let orgs = await this._api.organizations.listOrganizations();
            if (!orgs.body.success) {
                throw new Error('Invalid JWT token, cannot retrieve organizations: ' + orgs.body.error);
            }
        }

        // OK, now we're OK!
        await this.store(config);
        this._configured = true;

        return {
            api: this._api,
            endpoints: this._endpoints,
            setDeviceUpload: setDeviceUpload,
        };
    }

    async getDataForwarderDevice(deviceId: string) {
        let config = await this.load();
        return config.dataForwarderDevices[deviceId];
    }

    async storeDataForwarderDevice(deviceId: string, data: {
        apiKey: string,
        hmacKey: string,
        projectId: number,
        samplingFreq: number,
        sensors: string[]
    }) {
        let config = await this.load();
        config.dataForwarderDevices[deviceId] = data;
        await this.store(config);
    }

    async deleteDataForwarderDevice(deviceId: string) {
        let config = await this.load();
        delete config.dataForwarderDevices[deviceId];
        await this.store(config);
    }

    async getDaemonDevice(deviceId: string) {
        let config = await this.load();
        return config.daemonDevices[deviceId];
    }

    async storeDaemonDevice(deviceId: string, data: {
        projectId: number
    }) {
        let config = await this.load();
        config.daemonDevices[deviceId] = data;
        await this.store(config);
    }

    async deleteDaemonDevice(deviceId: string) {
        let config = await this.load();
        delete config.daemonDevices[deviceId];
        await this.store(config);
    }

    async getCamera() {
        let config = await this.load();
        return config.camera;
    }

    async storeCamera(camera: string) {
        let config = await this.load();
        config.camera = camera;
        await this.store(config);
    }

    async getAudio() {
        let config = await this.load();
        return config.audio;
    }

    async storeAudio(audio: string) {
        let config = await this.load();
        config.audio = audio;
        await this.store(config);
    }

    private async load(): Promise<SerialConfig> {
        if (!await Config.exists(this._filename)) {
            return {
                host: '',
                jwtToken: '',
                uploaderProjectId: undefined,
                lastVersionCheck: Date.now(),
                apiKey: undefined,
                dataForwarderDevices: { },
                daemonDevices: { },
                camera: undefined,
                audio: undefined,
                linuxProjectId: undefined
            };
        }

        try {
            let c = <SerialConfig>JSON.parse(await util.promisify(fs.readFile)(this._filename, 'utf-8'));
            if (!c.dataForwarderDevices) {
                c.dataForwarderDevices = { };
            }
            if (!c.daemonDevices) {
                c.daemonDevices = { };
            }
            // in v1.6.2 we did not properly filter the sensors array, so filter it out here
            for (let [ k, d ] of Object.entries(c.dataForwarderDevices)) {
                d.sensors = d.sensors.filter(f => !!f);
            }
            return c;
        }
        catch (ex2) {
            let ex = <Error>ex2;
            throw new Error('Failed to parse config ' + this._filename + ' ' + (ex.message || ex));
        }
    }

    private async store(config: SerialConfig) {
        await util.promisify(fs.writeFile)(this._filename, JSON.stringify(config, null, 4), 'utf-8');
    }
}
