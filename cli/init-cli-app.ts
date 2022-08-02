import { Config, EdgeImpulseConfig } from "./config";
import checkNewVersions from './check-new-version';
import fs from 'fs';
import Path from 'path';
import inquirer from 'inquirer';

const version = (<{ version: string }>JSON.parse(fs.readFileSync(Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;

export function getCliVersion() {
    return version;
}

export async function initCliApp(opts: {
    appName: string,
    silentArgv: boolean,
    cleanArgv: boolean,
    apiKeyArgv: string | undefined,
    devArgv: boolean,
    hmacKeyArgv: string | undefined,
    connectProjectMsg: string,
}) {
    if (!opts.silentArgv) {
        console.log(opts.appName + ' v' + version);
    }

    const configFactory = new Config();
    let config: EdgeImpulseConfig | undefined;

    try {
        if (opts.cleanArgv || opts.apiKeyArgv) {
            await configFactory.clean();
        }

        try {
            await checkNewVersions(configFactory);
        }
        catch (ex) {
            /* noop */
        }

        // this verifies host settings and verifies the JWT token
        try {
            config = await configFactory.verifyLogin(opts.devArgv, opts.apiKeyArgv);
        }
        catch (ex2) {
            let ex = <Error>ex2;
            let msg = ex.message || ex.toString();
            if (msg.indexOf('need to set an app password') > -1) {
                console.log('');
                console.log('\x1b[33mWARN\x1b[0m', ex.message);
                console.log('');
                process.exit(1);
            }
            else if (msg.indexOf('Password is incorrect') > -1 ||
                     msg.indexOf('User not found') > -1) {
                console.log('');
                console.log('\x1b[33mWARN\x1b[0m', ex.message);
                console.log('');
            }
            else {
                console.log('Stored token seems invalid, clearing cache...', ex);
            }
            await configFactory.clean();
            config = await configFactory.verifyLogin(opts.devArgv, opts.apiKeyArgv);
        }
    }
    catch (ex2) {
        let ex = <Error>ex2;
        if ((<any>ex).statusCode) {
            console.error('Failed to authenticate with Edge Impulse',
                (<any>ex).statusCode, (<any>(<any>ex).response).body);
        }
        else {
            console.error('Failed to authenticate with Edge Impulse', ex.message || ex.toString());
        }
        process.exit(1);
    }

    return {
        configFactory,
        config
    };
}

export async function setupCliApp(configFactory: Config, config: EdgeImpulseConfig, opts: {
    appName: string,
    silentArgv: boolean,
    cleanArgv: boolean,
    apiKeyArgv: string | undefined,
    devArgv: boolean,
    hmacKeyArgv: string | undefined,
    connectProjectMsg: string,
    getProjectFromConfig?: (deviceId: string | undefined) => Promise<{ projectId: number } | undefined>
}, deviceId: string | undefined) {
    let projectId = await configFactory.getUploaderProjectId();

    if (projectId) {
        try {
            let projectInfoReq = (await config.api.projects.getProjectInfo(projectId));
            if (!opts.silentArgv) {
                console.log('    Project:    ', projectInfoReq.project.name + ' (ID: ' + projectId + ')');
                console.log('');
            }
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.warn('Cannot read cached project (' + (ex.message || ex.toString()) + ')');
            projectId = undefined;
        }
    }

    if (!projectId) {
        if (!opts.silentArgv) {
            console.log('');
        }

        let fromConfig = opts.getProjectFromConfig ?
            await opts.getProjectFromConfig(deviceId) :
            undefined;

        let projectList = (await config.api.projects.listProjects());

        if (!projectList.projects || projectList.projects.length === 0) {
            console.log('This user has no projects, create one before continuing');
            process.exit(1);
        }
        else if (fromConfig) {
            projectId = fromConfig.projectId;
        }
        else if (projectList.projects && projectList.projects.length === 1) {
            projectId = projectList.projects[0].id;
        }
        else {
            let inqRes = await inquirer.prompt([{
                type: 'list',
                choices: (projectList.projects || []).map(p => ({ name: p.owner + ' / ' + p.name, value: p.id })),
                name: 'project',
                message: opts.connectProjectMsg,
                pageSize: 20
            }]);
            projectId = Number(inqRes.project);
        }
    }

    let devKeys: { apiKey: string, hmacKey: string } = {
        apiKey: opts.apiKeyArgv || '',
        hmacKey: opts.hmacKeyArgv || '0'
    };
    if (!opts.apiKeyArgv) {
        try {
            let dk = (await config.api.projects.listDevkeys(projectId));

            if (!dk.apiKey) {
                throw new Error('No API key set (via --api-key), and no development API keys configured for ' +
                    'this project. Add a development API key from the Edge Impulse dashboard to continue.');
            }

            devKeys.apiKey = dk.apiKey;
            if (!opts.hmacKeyArgv && dk.hmacKey) {
                devKeys.hmacKey = dk.hmacKey;
            }
        }
        catch (ex2) {
            let ex = <Error>ex2;
            throw new Error('Failed to load development keys: ' + (ex.message || ex.toString()));
        }
    }

    return {
        projectId,
        devKeys
    };
}
