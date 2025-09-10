import crypto from 'crypto';
import os from 'os';
import Path from 'path';
import fs from 'fs';
import util from 'util';
import inquirer from 'inquirer';
import { ips } from './get-ips';
import { EdgeImpulseApi } from '../sdk/studio/api';
import * as models from '../sdk/studio/sdk/model/models';

const PREFIX = '\x1b[34m[CFG]\x1b[0m';

export interface RunnerConfig {
    projectId: number | undefined;
    blockId: number | undefined;
    storageIndex: number | undefined;
    storagePath: string;
    storageMaxSizeMb: number | undefined;
    deploymentVersion: number | undefined;
    monitorSummaryIntervalMs: number | undefined;
    // key = projectId
    impulseIdsForProjectId: { [k: string ]: { impulseId: number } } | undefined;
    modelVariantsForProjectId: { [k: string ]: { variant: models.KerasModelVariantEnum } } | undefined;
}

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
    runner: RunnerConfig;
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
    api: EdgeImpulseApi;
    endpoints: EdgeImpulseEndpoints;
    setDeviceUpload: boolean;
    host: string;
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

    /**
     * Unlinks a file, but does not throw if unlinking fails.
     */
    static async safeUnlinkFile(path: string) {
        try {
            await fs.promises.unlink(path);
        }
        catch (ex) {
            /* noop */
        }
    }

    /**
     * Atomic write (first write to temp file, then rename)
     */
    static async writeFileAtomic(path: string, content: string | Buffer) {
        const tempPath = path + '.' + crypto.randomBytes(8).toString('hex') + '.lock';
        try {
            await fs.promises.mkdir(Path.dirname(path), { recursive: true });
            if (typeof content === 'string') {
                await fs.promises.writeFile(tempPath, content, 'utf-8');
            }
            else {
                await fs.promises.writeFile(tempPath, content);
            }
            // rename should be atomic
            await fs.promises.rename(tempPath, path);
        }
        finally {
            await Config.safeUnlinkFile(tempPath);
        }
    }

    private _filename: string;
    private _api: EdgeImpulseApi | undefined;
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

    async removeProjectReferences() {
        let config = await this.load();
        delete config.apiKey;
        delete config.linuxProjectId;
        delete config.uploaderProjectId;
        await this.store(config);
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
                const hostRes = <{ host: string }>await inquirer.prompt([{
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

        this._api = new EdgeImpulseApi({
            endpoint: apiEndpointInternal,
            extraHeaders: { 'User-Agent': 'EDGE_IMPULSE_CLI' },
        });

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
            await this._api.authenticate({
                method: 'apiKey',
                apiKey: apiKey
            });

            config.apiKey = apiKey;
        }
        else {
            if (!config.jwtToken) {
                config.jwtToken = await this.getJWTToken(this._api, config, host);
            }

            await this._api.authenticate({
                method: 'jwtToken',
                jwtToken: config.jwtToken,
            });
        }

        await this.verifyAccess(config, verifyType);

        // fetch user...
        if (config.jwtToken) {
            let user = await this._api.user.getCurrentUser();
            // check if has developer profile...
            if (!user.organizations.find(x => x.isDeveloperProfile)) {
                console.log(PREFIX, 'Creating developer profile...');
                await this._api.user.createDeveloperProfile();
                console.log(PREFIX, 'Creating developer profile OK');
            }
        }

        // OK, now we're OK!
        await this.store(config);
        this._configured = true;

        return {
            api: this._api,
            endpoints: this._endpoints,
            setDeviceUpload: setDeviceUpload,
            host: host,
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

    async getRunner(): Promise<RunnerConfig> {
        let config = await this.load();
        return config.runner;
    }

    async storeStoragePath(path: string) {
        let config = await this.load();
        config.runner.storagePath = path;
        await this.store(config);
    }

    async getStoragePath(): Promise<string> {
        let config = await this.load();
        return config.runner.storagePath || this.getDefaultStoragePath();
    }

    async getStorageIndex(): Promise<number> {
        let config = await this.load();
        return config.runner.storageIndex || 0;
    }

    async storeStorageIndex(index: number) {
        let config = await this.load();
        config.runner.storageIndex = index;
        await this.store(config);
    }

    async getStorageMaxSizeMb() {
        let config = await this.load();
        if (!config) {
            return undefined;
        }
        return config.runner.storageMaxSizeMb;
    }

    async setStorageMaxSizeMb(maxSizeMb: number) {
        let config = await this.load();
        config.runner.storageMaxSizeMb = maxSizeMb;
        await this.store(config);
    }

    async storeProjectId(projectId: number) {
        let config = await this.load();
        config.runner.projectId = projectId;
        await this.store(config);
    }

    async storeBlockId(blockId: number) {
        let config = await this.load();
        config.runner.blockId = blockId;
        await this.store(config);
    }

    async setRunnerImpulseIdForProjectId(projectId: number, impulseId: number) {
        let config = await this.load();
        config.runner.impulseIdsForProjectId = config.runner.impulseIdsForProjectId || { };
        config.runner.impulseIdsForProjectId[projectId.toString()] = { impulseId };
        await this.store(config);
    }

    async getRunnerImpulseIdForProjectId(projectId: number) {
        let config = await this.load();
        if (!config.runner.impulseIdsForProjectId) {
            return null;
        }

        let ret = <{ impulseId: number } | undefined>config.runner.impulseIdsForProjectId[projectId.toString()];
        return ret ? ret.impulseId : null;
    }

    async setRunnerModelVariantForProjectId(projectId: number, variant: models.KerasModelVariantEnum) {
        let config = await this.load();
        config.runner.modelVariantsForProjectId = config.runner.modelVariantsForProjectId || { };
        config.runner.modelVariantsForProjectId[projectId.toString()] = { variant };
        await this.store(config);
    }

    async getRunnerModelVariantForProjectId(projectId: number): Promise<models.KerasModelVariantEnum | null> {
        let config = await this.load();
        if (!config.runner.modelVariantsForProjectId) {
            return null;
        }

        let ret = <{ variant: models.KerasModelVariantEnum } | undefined>
            config.runner.modelVariantsForProjectId[projectId.toString()];
        return ret ? ret.variant : null;
    }

    async getDeploymentVersion() {
        let config = await this.load();
        if (!config) {
            return undefined;
        }
        return config.runner.deploymentVersion;
    }

    async setDeploymentVersion(deploymentVersion: number) {
        let config = await this.load();
        config.runner.deploymentVersion = deploymentVersion;
        await this.store(config);
    }

    async getStudioUrl(whitelabelId: number | null) {
        if (whitelabelId !== null) {
            const whitelabelRequest = await this._api?.whitelabels.getWhitelabelDomain(whitelabelId);
            if (whitelabelRequest && whitelabelRequest.success && whitelabelRequest.domain) {
                const protocol = this._endpoints?.internal.api.startsWith('https') ? 'https' : 'http';
                return `${protocol}://${whitelabelRequest.domain}`;
            }
        }
        return this._endpoints?.internal.api.replace('/v1', '');
    }

    getDefaultModelsPath() {
        return Path.join(this.getDefaultRunnerPath(), 'models');
    }

    getDefaultStoragePath() {
        return Path.join(this.getDefaultRunnerPath(), 'storage');
    }

    private getDefaultRunnerPath() {
        return Path.join(os.homedir(), '.ei-linux-runner');
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
                linuxProjectId: undefined,
                runner: {
                    projectId: undefined,
                    blockId: undefined,
                    deploymentVersion: undefined,
                    storageIndex: undefined,
                    storagePath: this.getDefaultStoragePath(),
                    impulseIdsForProjectId: undefined,
                    modelVariantsForProjectId: undefined,
                    storageMaxSizeMb: undefined,
                    monitorSummaryIntervalMs: undefined,
                }
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

    /**
     * This'll throw when access failed
     * @param config
     * @param verifyType
     */
    private async verifyAccess(config: SerialConfig, verifyType: String) {
        const api = this._api;
        if (!api) {
            throw new Error('api is null');
        }

        if (verifyType === 'project') {
            try {
                await api.projects.listProjects();
            }
            catch (ex2) {
                let ex = <Error>ex2;

                if ((ex.message || ex.toString()).indexOf('Invalid API key') > -1) {
                    await api.organizations.listOrganizations();
                    throw new Error(`The API key you provided (${(config.apiKey || '').slice(0, 10)}...) ` +
                        `is an organization API Key. This CLI command requires a project API Key ` +
                        `(or omit the --api-key argument to log in using a username and password).`);
                }
                else {
                   throw ex;
                }
            }
        }
        else {
            try {
                await api.organizations.listOrganizations();
            }
            catch (ex2) {
                let ex = <Error>ex2;

                if ((ex.message || ex.toString()).indexOf('Invalid API key') > -1) {
                    await api.projects.listProjects();
                    throw new Error(`The API key you provided (${(config.apiKey || '').slice(0, 10)}...) ` +
                        `is a project API Key. This CLI command requires an organization API Key ` +
                        `(or omit the --api-key argument to log in using a username and password).`);
                }
                else {
                   throw ex;
                }
            }
        }
    }

    private async getJWTToken(api: EdgeImpulseApi, config: SerialConfig, host: string) : Promise<string> {

        const username = <{ username: string }>await inquirer.prompt({
            type: 'input',
            name: 'username',
            message: `What is your user name or e-mail address (${host})?`
        });

        const { needPassword, email, whitelabels } =
            await api.user.getUserNeedToSetPassword(username.username);

        if (needPassword) {
            const protocol = `http${
                config.host === 'localhost' ? '' : 's'
            }://`;
            const port = `${
                config.host === 'localhost' ? ':4800' : ''
            }`;
            const encodedEmail = encodeURIComponent(`${email}`);
            let resetUrl;
            if (whitelabels && whitelabels.length === 1) {
                resetUrl =
                    `${protocol}${whitelabels[0] || config.host}${port}/set-password?email=${encodedEmail}`;
            }
            // Some users may be part of different white labels. In these cases, we cannot provide an
            // URL for them to set the password, so we invite them to visit their user profile.

            let errorMsg = 'To use the CLI you will need to set a password. ';
            errorMsg +=
                resetUrl ?
                `Go to ${resetUrl} to set one.` :
                'Go to your user profile settings in Studio to set one.';

            throw new Error(
                errorMsg,
            );
        }

        const password = <{ password: string }>await inquirer.prompt({
            type: 'password',
            name: 'password',
            message: `What is your password?`
        });

        let res: models.GetJWTResponse;
        try {
            res = (await api.login.login({
                username: username.username,
                password: password.password,
            }));
        }
        catch (ex2) {
            let ex = <Error>ex2;
            if ((ex.message || ex.toString()).startsWith('ERR_TOTP_TOKEN IS REQUIRED')) {

                // For TOTP allow the user to enter another one if it's invalid (so run in a loop)
                while (1) {
                    try {
                        const totpToken = <{ totpToken: string }>await inquirer.prompt({
                            type: 'input',
                            name: 'totpToken',
                            message: `Enter a code from your authenticator app`
                        });

                        res = (await api.login.login({
                            username: username.username,
                            password: password.password,
                            totpToken: totpToken.totpToken,
                        }));
                        break;
                    }
                    catch (ex3) {
                        let totpEx = <Error>ex3;
                        console.warn('Failed to log in:', totpEx.message || totpEx.toString());
                    }
                }
            }
            else {
                throw ex;
            }
        }

        if (!res!.token) {
            throw new Error('Authentication did not return a token');
        }

        return res!.token;
    }

    private async store(config: SerialConfig) {
        await Config.writeFileAtomic(this._filename, JSON.stringify(config, null, 4));
    }

    async getMonitorSummaryIntervalMs() {
        let config = await this.load();
        if (!config) {
            return undefined;
        }
        return config.runner.monitorSummaryIntervalMs;
    }

    async setMonitorSummaryIntervalMs(ms: number) {
        let config = await this.load();
        config.runner.monitorSummaryIntervalMs = ms;
        await this.store(config);
    }
}
