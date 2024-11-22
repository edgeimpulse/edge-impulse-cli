import { Config, EdgeImpulseConfig } from "./config";
import checkNewVersions from './check-new-version';
import fs from 'fs';
import Path from 'path';
import inquirer from 'inquirer';
import { AWSSecretsManagerUtils } from "./aws-sm-utils";
import { AWSIoTCoreConnector } from "./aws-iotcore-connector";

const version = (<{ version: string }>JSON.parse(fs.readFileSync(Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;

export function getCliVersion() {
    return version;
}

export async function initCliApp(opts: {
    appName: string,
    silentArgv: boolean,
    cleanArgv: boolean,
    apiKeyArgv: string | undefined,
    greengrassArgv: boolean,
    devArgv: boolean,
    hmacKeyArgv: string | undefined,
    connectProjectMsg: string,
}) {
    if (!opts.silentArgv) {
        console.log(opts.appName + ' v' + version);
    }

    const configFactory = new Config();
    let config: EdgeImpulseConfig | undefined;

    // AWS Support
    let awsSM: AWSSecretsManagerUtils | undefined;
    let awsIOT: AWSIoTCoreConnector | undefined;

    try {
        if (opts.cleanArgv) {
            await configFactory.clean();
        }

        // AWS: Secrets Manager + IoTCore Connect Integration
        if (opts.greengrassArgv) {
            if (awsSM === undefined) {
                awsSM = await new AWSSecretsManagerUtils(opts);
            }
            let smApiKey: string;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            smApiKey = await awsSM.getEdgeImpulseAPIKeyFromSecretsManager();
            if (smApiKey !== undefined && smApiKey.length > 0) {
                // assign if we capture the API key via SM...
                opts.apiKeyArgv = smApiKey;

                // we only need AWS IoTCore connectivity for the runner app...
                if (opts.appName === "Edge Impulse Linux runner" ) {
                    // success - allocate the AWS IoT Helper
                    awsIOT = new AWSIoTCoreConnector(opts);
                    if (awsIOT !== undefined) {
                        if (!opts.silentArgv) {
                            console.log(opts.appName + ": Connecting to IoTCore...");
                        }
                        const connected = await awsIOT.connect();
                        if (connected) {
                            // success
                            console.log(opts.appName + ": Connected to IoTCore Successfully!");

                            // launch the command poller
                            console.log(opts.appName + ": launching command receiver...");
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            awsIOT.launchCommandReceiver();
                        }
                        else {
                            // failure
                            console.log(opts.appName + ": FAILED to connect to IoTCore");
                        }
                    }
                }

                // continue...
                await configFactory.removeProjectReferences();
            }
            else {
                if (!opts.silentArgv) {
                    // unable to continue as no API key was found in Secrets Manager
                    console.log(opts.appName + " ERROR: Unable to find EI API Key within AWS Secrets Manager. Check AWS configuration. Continuing...");
                }
            }
        }
        // AWS: Secrets Manager + IoTCore Connect Integration

        if (opts.apiKeyArgv) {
            await configFactory.removeProjectReferences();
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
            if (msg.indexOf('need to set a password') > -1) {
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
            else if (msg.indexOf('The API key you provided') > -1) {
                // immediately jump to the "Failed to authenticate" printing
                throw ex;
            }
            else {
                console.log('Stored token seems invalid, clearing cache...');
                console.log(ex.message);
            }
            await configFactory.clean();
            config = await configFactory.verifyLogin(opts.devArgv, opts.apiKeyArgv);
        }
    }
    catch (ex2) {
        let ex = <Error>ex2;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if ((<any>ex).statusCode) {
            console.error('Failed to authenticate with Edge Impulse:',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                (<any>ex).statusCode, (<any>(<any>ex).response).body);
        }
        else {
            console.error('Failed to authenticate with Edge Impulse:', ex.message || ex.toString());
        }
        process.exit(1);
    }

    // AWS Integration additions
    if (awsSM !== undefined && awsIOT !== undefined) {
        return {
            configFactory,
            config,
            awsSM,
            awsIOT
        };
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
            let projectInfoReq = (await config.api.projects.getProjectInfo(projectId, { }));
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

        if (!projectId) {
            throw new Error('projectId is null');
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
        devKeys,
    };
}
