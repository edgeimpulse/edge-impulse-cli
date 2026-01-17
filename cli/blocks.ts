#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import Path from 'node:path';
import os from 'node:os';
import program from 'commander';
import { Config, EdgeImpulseConfig } from '../cli-common/config';
import checkNewVersions from '../cli-common/check-new-version';
import inquirer from 'inquirer';
import { c as compress } from 'tar';
import dockerignore from '@zeit/dockerignore';
import { getCliVersion } from '../cli-common/init-cli-app';
import { BlockRunner, BlockRunnerFactory, RunnerOptions } from './block-runner';
import * as models from  '../sdk/studio/sdk/model/models';
import { InitCLIBlock } from './blocks/init-cli-block';
import { bytesToSize, deepCompare, guessRepoUrl, pathExists, sleep, spinner } from './blocks/blocks-helper';
import { BlockConfigManager } from './blocks/block-config-manager';
import { addOrganizationDeployBlockFormParams, RequestDetailedFile } from '../sdk/studio/sdk/api';
import { CLIBlockType } from '../shared/parameters-json-types';
import { TurnOptionalIntoOrUndefined, UpdateRemoteBlockFromParamsJson } from './blocks/update-remote-block-from-params-json';
import { AIActionBlockParametersJson, SyntheticDataBlockParametersJson, TransformBlockParametersJson } from './blocks/parameter-types';

const version = getCliVersion();

export type MessageBlock = [
    string,
    {
        data?: string,
        success?: boolean,
        hello?: { version: number }
    }
];

const packageVersion = (<{ version: string }>JSON.parse(fs.readFileSync(
    Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;

program
    .description('Create, run, and publish custom blocks')
    .version(packageVersion)
    .option('-c --clean', 'Reset the current user')
    .option('-d --dev', 'Developer mode')
    .option('--api-key <key>', 'API key')
    .allowUnknownOption(false);

const init = program.command('init')
            .option('--create-new-block', `Don't prompt to create a new block or update an existing block, auto-picks "Create a new block"`)
            .description('Initialize the current folder as a new block');

const push = program.command('push')
            .description('Push the current block to Edge Impulse');

const runner = program.command('runner')
               .description('Run the current block locally')
               .option('--dataset <dataset>', 'Tranformation block: Name of dataset')
               .option('--data-item <dataItem>', 'Tranformation block: Name of data item')
               .option('--file <filename>', 'File tranformation block: Name of file in data item')
               .option('--epochs <number>', 'Transfer learning: # of epochs to train')
               .option('--learning-rate <learningRate>', 'Transfer learning: Learning rate while training')
               .option('--validation-set-size <size>', 'Transfer learning: Size of validation set')
               .option('--input-shape <shape>', 'Transfer learning: List of axis dimensions. Example: "(1, 4, 2)"')
               .option('--download-data [directory]', 'Transfer learning or deploy: Only download data and don\'t run the block')
               .option('--extra-args <args>', 'Pass extra arguments/options to the Docker container')
               .option('--skip-download', `Tranformation block: Don't download data`);

program.parse(process.argv);

const initCommand = program.args[0] === 'init';
const pushCommand = program.args[0] === 'push';
const runnerCommand = program.args[0] === 'runner';

const cleanArgv = !!program.clean;
const devArgv = !!program.dev;
const apiKeyArgv = program.apiKey ? <string>program.apiKey : undefined;

const initOpts = init.opts();
const runnerOpts = runner.opts();

const dockerfilePath = Path.join(process.cwd(), 'Dockerfile');
const dockerignorePath = Path.join(process.cwd(), '.dockerignore');

let pushingBlockJobId: { organizationId: number, jobId: number } | undefined;

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    console.log('Edge Impulse Blocks v' + version);

    const configFactory = new Config();
    let config: EdgeImpulseConfig | undefined;

    // Login
    try {
        if (cleanArgv || apiKeyArgv) {
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
            config = await configFactory.verifyLogin(devArgv, apiKeyArgv, apiKeyArgv ? 'org' : 'project');
        }
        catch (ex2) {
            if (apiKeyArgv) {
                throw ex2;
            }
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
            else if (msg.indexOf('The API key you provided') > -1) {
                // immediately jump to the "Failed to authenticate" printing
                throw ex;
            }
            else {
                console.log('Stored token seems invalid, clearing cache...', ex);
            }
            await configFactory.clean();
            config = await configFactory.verifyLogin(devArgv, apiKeyArgv, apiKeyArgv ? 'org' : 'project');
        }
    }
    catch (ex2) {
        let ex = <Error>ex2;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if ((<any>ex).statusCode) {
            console.error('Failed to authenticate with Edge Impulse:',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                (<any>ex).statusCode, ((<any>ex).response).body);
        }
        else {
            console.error('Failed to authenticate with Edge Impulse:', ex.message || ex.toString());
        }
        process.exit(1);
    }

    if (!initCommand && !pushCommand && !runnerCommand) {
        console.log('Specify a command:');
        console.log('\tinit: Initialize the current folder as a new block');
        console.log('\tpush: Push the current folder to the server');
        console.log('\trunner: Run the current block locally');
        return;
    }

    let firstExit = true;

    const onSignal = async () => {
        if (!pushingBlockJobId || !config) {
            process.exit(0);
        }
        if (!firstExit) {
            process.exit(1);
        }
        else {
            console.log('Received stop signal, canceling build... ' +
                'Press CTRL+C again to force quit.');
            firstExit = false;
            try {
                await config.api.organizationJobs.cancelOrganizationJob(
                    pushingBlockJobId.organizationId,
                    pushingBlockJobId.jobId,
                    { }
                );
                process.exit(0);
            }
            catch (ex2) {
                let ex = <Error>ex2;
                console.log('Failed to stop cancel job', ex.message);
            }
            process.exit(1);
        }
    };

    process.on('SIGHUP', onSignal);
    process.on('SIGINT', onSignal);

    if (!config) return;

    const blockConfigManager = new BlockConfigManager(config, process.cwd());

    if (initCommand) {
        // Initialize the current folder as a new block

        // Check if a config file already exists
        let blockConfig;
        try {
            blockConfig = await blockConfigManager.loadConfig({
                throwOnMissingParams: false,
                clean: cleanArgv,
            });
        }
        catch (ex2) {
            const ex = <Error>ex2;
            console.log(ex.message || ex.toString());
            process.exit(1);
        }

        if (blockConfig && blockConfig.config) {
            console.log(`A block already exists in this location for this host (${config.host}). ` +
                `You can re-init this block via "edge-impulse-blocks init --clean" or ` +
                `use "edge-impulse-blocks push" to push it.`);
            process.exit(1);
        }

        const initBlock = new InitCLIBlock(config, process.cwd(), blockConfigManager, {
            alwaysCreateNewBlock: initOpts.createNewBlock === true ? true : false,
        });

        const organizationInfo = await initBlock.getOrganization();
        const organizationId = organizationInfo.organization.id;

        console.log(`Attaching block to organization '${organizationInfo.organization.name}'`);

        if (!blockConfig) {
            let blockList = organizationInfo.organization.isDeveloperProfile ?
                [
                    {
                        name: 'Machine learning block',
                        value: 'machine-learning'
                    }
                ] :
                [
                    {
                        name: 'Transformation block',
                        value: 'transform'
                    },
                    {
                        name: 'Synthetic data block',
                        value: 'synthetic-data'
                    },
                    {
                        name: 'AI labeling block',
                        value: 'ai-action'
                    },
                    {
                        name: 'Deployment block',
                        value: 'deploy'
                    },
                    {
                        name: 'DSP block',
                        value: 'dsp'
                    },
                    {
                        name: 'Machine learning block',
                        value: 'machine-learning'
                    }
                ];

            // Select the type of block
            let blockTypeInqRes = await inquirer.prompt([{
                type: 'list',
                choices: blockList,
                name: 'type',
                message: 'Choose a type of block' +
                    (organizationInfo.organization.isDeveloperProfile ?
                        ' (transform, DSP and deploy block types are hidden because you are ' +
                            'pushing to a personal profile)' :
                        ''),
                pageSize: 20
            }]);
            let blockType = <CLIBlockType>blockTypeInqRes.type;

            await initBlock.initBlock(blockType, organizationInfo);
        }
        else {
            await initBlock.initBlock(blockConfig.type, organizationInfo);
        }

        console.log('');
        console.log(`Your new block has been created in '${process.cwd()}'.`);
        console.log(`When you have finished building your block, run 'edge-impulse-blocks ` +
            `push' to update the block in Edge Impulse.`);
        process.exit(0);
    }

    if (pushCommand) {
        // Tar & compress the repository and push to the endpoint

        let currentBlockConfig;
        try {
            currentBlockConfig = await blockConfigManager.loadConfig({
                throwOnMissingParams: false,
            });
        }
        catch (ex2) {
            const ex = <Error>ex2;
            console.log(ex.message || ex.toString());
            process.exit(1);
        }

        if (!currentBlockConfig || !currentBlockConfig.config) {
            console.error('A configuration cannot be found for this host (' + config.host + '). ' +
                'Run "edge-impulse-blocks init" to create a new block.');
            process.exit(1);
        }

        // Get the cwd name
        const cwd = Path.basename(process.cwd());

        // Get the organization id
        const organizationId = currentBlockConfig.config.organizationId;

        // Get the organization name
        let organizationNameResponse: models.OrganizationInfoResponse;
        try {
            organizationNameResponse = await config.api.organizations.getOrganizationInfo(organizationId);
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.error(`Unable to find organization ${organizationId}. Does the organization still exist?`);
            console.error('    ' + ex.message || ex.toString());
            console.error('Or, run with --clean to re-authenticate.');
            process.exit(1);
        }

        const organizationName = organizationNameResponse.organization.name;
        const organizationWhitelabelId = organizationNameResponse.organization.whitelabelId;
        const studioUrl = await configFactory.getStudioUrl(organizationWhitelabelId);

        if (!currentBlockConfig.parameters.info.name) {
            console.log(`Your parameters.json file is missing "parameters.name", ` +
                `run "edge-impulse-blocks init" to initialize your block.`);
            process.exit(1);
        }
        if (!currentBlockConfig.parameters.info.description) {
            console.log(`Your parameters.json file is missing "parameters.description", ` +
                `run "edge-impulse-blocks init" to initialize your block.`);
            process.exit(1);
        }

        const blockName = currentBlockConfig.parameters.info.name;
        const blockDescription = currentBlockConfig.parameters.info.description;

        try {
            // Some blocks (e.g. custom learn blocks or transform blocks) have JSON parameters.
            // We should update these AFTER pushing the block.
            let shouldOverwriteParamsAfterPush = false;
            // Other properties (non-params)
            let shouldOverwriteConfigAfterPush = false;

            const updateRemoteBlock = new UpdateRemoteBlockFromParamsJson(config);

            if (!currentBlockConfig.config.id)  {
                let repoUrl = await guessRepoUrl();

                // Create a new block
                let newResponse: { success: boolean, id: number, error?: string };
                if (currentBlockConfig.type === 'transform') {
                    // If you get a type error here, it means that a new field was added to the add request
                    // and you need to update the parameters json spec (or set the field to undefined) here.
                    const newObj: TurnOptionalIntoOrUndefined<models.AddOrganizationTransformationBlockRequest> = {
                        name: blockName,
                        description: blockDescription,
                        dockerContainer: '',
                        indMetadata: typeof currentBlockConfig.parameters.info.indMetadata === 'boolean' ?
                            currentBlockConfig.parameters.info.indMetadata :
                            true,
                        cliArguments: currentBlockConfig.parameters.info.cliArguments || '',
                        allowExtraCliArguments: typeof currentBlockConfig.parameters.info.allowExtraCliArguments === 'boolean' ?
                            currentBlockConfig.parameters.info.allowExtraCliArguments :
                            false,
                        operatesOn: currentBlockConfig.parameters.info.operatesOn || 'file',
                        additionalMountPoints:
                            (currentBlockConfig.parameters.info.transformMountpoints || []).map(x => {
                                return {
                                    type: 'bucket',
                                    bucketId: x.bucketId,
                                    mountPoint: x.mountPoint,
                                };
                            }),
                        parameters: currentBlockConfig.parameters.parameters,
                        repositoryUrl: repoUrl,
                        showInDataSources: currentBlockConfig.parameters.info.operatesOn === 'standalone' ?
                            true : false,
                        showInCreateTransformationJob: typeof currentBlockConfig.parameters.info.showInCreateTransformationJob === 'boolean' ?
                            currentBlockConfig.parameters.info.showInCreateTransformationJob :
                            true,
                        showInSyntheticData: false,
                        showInAIActions: false,
                        isPublic: false,
                        publicProjectTierAvailability: undefined,
                        limitsCpu: undefined,
                        limitsMemory: undefined,
                        maxRunningTimeStr: undefined,
                        requestsCpu: undefined,
                        requestsMemory: undefined,
                        environmentVariables: await getEnvVariablesForBlock(currentBlockConfig.parameters, undefined),
                        aiActionsOperatesOn: undefined,
                        sourceCodeDownloadStaffOnly: undefined,
                    };
                    newResponse = await config.api.organizationBlocks.addOrganizationTransformationBlock(
                        organizationId, newObj);
                }
                else if (currentBlockConfig.type === 'synthetic-data') {
                    // If you get a type error here, it means that a new field was added to the add request
                    // and you need to update the parameters json spec (or set the field to undefined) here.
                    const newObj: TurnOptionalIntoOrUndefined<models.AddOrganizationTransformationBlockRequest> = {
                        name: blockName,
                        description: blockDescription,
                        dockerContainer: '',
                        indMetadata: true,
                        cliArguments: '',
                        allowExtraCliArguments: false,
                        operatesOn: 'standalone',
                        additionalMountPoints: [],
                        parameters: currentBlockConfig.parameters.parameters,
                        repositoryUrl: repoUrl,
                        showInDataSources: false,
                        showInCreateTransformationJob: false,
                        showInSyntheticData: true,
                        showInAIActions: false,
                        isPublic: false,
                        publicProjectTierAvailability: undefined,
                        limitsCpu: undefined,
                        limitsMemory: undefined,
                        maxRunningTimeStr: undefined,
                        requestsCpu: undefined,
                        requestsMemory: undefined,
                        environmentVariables: await getEnvVariablesForBlock(currentBlockConfig.parameters, undefined),
                        aiActionsOperatesOn: undefined,
                        sourceCodeDownloadStaffOnly: undefined,
                    };
                    newResponse = await config.api.organizationBlocks.addOrganizationTransformationBlock(
                        organizationId, newObj);
                }
                else if (currentBlockConfig.type === 'ai-action') {
                    // If you get a type error here, it means that a new field was added to the add request
                    // and you need to update the parameters json spec (or set the field to undefined) here.
                    const newObj: TurnOptionalIntoOrUndefined<models.AddOrganizationTransformationBlockRequest> = {
                        name: blockName,
                        description: blockDescription,
                        dockerContainer: '',
                        indMetadata: true,
                        cliArguments: '',
                        allowExtraCliArguments: false,
                        operatesOn: 'standalone',
                        additionalMountPoints: [],
                        parameters: currentBlockConfig.parameters.parameters,
                        repositoryUrl: repoUrl,
                        showInDataSources: false,
                        showInCreateTransformationJob: false,
                        showInSyntheticData: false,
                        showInAIActions: true,
                        isPublic: false,
                        publicProjectTierAvailability: undefined,
                        limitsCpu: undefined,
                        limitsMemory: undefined,
                        maxRunningTimeStr: undefined,
                        requestsCpu: undefined,
                        requestsMemory: undefined,
                        environmentVariables: await getEnvVariablesForBlock(currentBlockConfig.parameters, undefined),
                        aiActionsOperatesOn: currentBlockConfig.parameters.info.operatesOn,
                        sourceCodeDownloadStaffOnly: undefined,
                    };
                    newResponse = await config.api.organizationBlocks.addOrganizationTransformationBlock(
                        organizationId, newObj);
                }
                else if (currentBlockConfig.type === 'deploy') {
                    // If you get a type error here, it means that a new field was added to the add request
                    // and you need to update the parameters json spec (or set the field to undefined) here.
                    const newObj: TurnOptionalIntoOrUndefined<addOrganizationDeployBlockFormParams> = {
                        name: blockName,
                        dockerContainer: '',
                        description: blockDescription,
                        category: currentBlockConfig.parameters.info.category,
                        integrateUrl: currentBlockConfig.parameters.info.integrateUrl,
                        cliArguments: currentBlockConfig.parameters.info.cliArguments,
                        supportsEonCompiler: currentBlockConfig.parameters.info.supportsEonCompiler,
                        mountLearnBlock: currentBlockConfig.parameters.info.mountLearnBlock,
                        showOptimizations: currentBlockConfig.parameters.info.showOptimizations,
                        limitsCpu: undefined,
                        limitsMemory: undefined,
                        photo: undefined,
                        requestsCpu: undefined,
                        requestsMemory: undefined,
                        privileged: currentBlockConfig.parameters.info.privileged,
                        sourceCodeDownloadStaffOnly: undefined,
                        parameters: currentBlockConfig.parameters.parameters,
                    };

                    newResponse = await config.api.organizationBlocks.addOrganizationDeployBlock(
                        organizationId, newObj);
                }
                else if (currentBlockConfig.type === 'dsp') {

                    let portChoices: {name: string, value: number}[] = [];

                    // find choices from dockerfile
                    //
                    // note: we expect to find only a single 'EXPOSE' directive in
                    // the Dockerfile, otherwise the first found will be used.
                    let dockerChoice: number | undefined;
                    if (await pathExists(dockerfilePath)) {
                        let dockerfileLines = (await fs.promises.readFile(dockerfilePath))
                                .toString('utf-8').split('\n');
                        let exposeLine = dockerfileLines.find(x => x.toLowerCase().startsWith('expose'));
                        let exposePort = Number(exposeLine?.toLowerCase().replace('expose ', ''));
                        if ((typeof exposePort === 'number') && !isNaN(exposePort)) {
                            dockerChoice = exposePort;
                            portChoices.push({
                                name: `from ${Path.basename(dockerfilePath)}: ${dockerChoice}`,
                                value: dockerChoice
                            });
                        }
                    }

                    // find choice from the parameters
                    let parametersChoice: number | undefined;
                    if (typeof currentBlockConfig.parameters.info.port === 'number') {
                        parametersChoice = currentBlockConfig.parameters.info.port;
                        portChoices.push({ name: `from parameters: ${parametersChoice}`, value: parametersChoice });
                    }

                    // when no port setting is detected or
                    // multiple unique settings.
                    if (((typeof parametersChoice !== 'number') && (typeof dockerChoice !== 'number')) ||
                        ((typeof parametersChoice === 'number') && (typeof dockerChoice === 'number')
                            && parametersChoice !== dockerChoice)) {

                        console.log(`${portChoices.length} port(s) detected! ${portChoices.map(p => p.value)}`);

                        let portRes = await inquirer.prompt([{
                            type: 'number',
                            name: 'port',
                            message: 'What port is your block listening on?',
                        }]);
                        const port = Number(portRes.port);
                        if (isNaN(port)) {
                            console.error(`Invalid value for port, should be a number, but was "${portRes.port}"`);
                            process.exit(1);
                        }

                        currentBlockConfig.parameters.info.port = port;
                        await blockConfigManager.saveParameters(currentBlockConfig.parameters);
                    }
                    else if (typeof dockerChoice === 'number') {
                        // either parameters's port settings is undefined or
                        // it's the same as dockers's port setting in either
                        // case we'll use the docker's setting.
                        currentBlockConfig.parameters.info.port = dockerChoice.valueOf();
                        await blockConfigManager.saveParameters(currentBlockConfig.parameters);
                    }

                    console.log(`Pushing block listening on port: ${currentBlockConfig.parameters.info.port}`);

                    // If you get a type error here, it means that a new field was added to the add request
                    // and you need to update the parameters json spec (or set the field to undefined) here.
                    const newObj: TurnOptionalIntoOrUndefined<models.AddOrganizationDspBlockRequest> = {
                        name: blockName,
                        dockerContainer: '',
                        description: blockDescription,
                        port: currentBlockConfig.parameters.info.port || 80,
                        limitsCpu: undefined,
                        limitsMemory: undefined,
                        requestsCpu: undefined,
                        requestsMemory: undefined,
                        sourceCodeDownloadStaffOnly: undefined,
                    };

                    newResponse = await config.api.organizationBlocks.addOrganizationDspBlock(
                        organizationId, newObj);
                }
                else if (currentBlockConfig.type === 'machine-learning') {
                    let implementationVersion = 2;
                    let trainPath = Path.join(Path.dirname(dockerfilePath), 'train.py');
                    if (await pathExists(trainPath)) {
                        let trainFile = await fs.promises.readFile(trainPath, 'utf-8');
                        if (trainFile.indexOf('--validation-set-size') > -1) {
                            implementationVersion = 1;
                        }
                    }

                    const info = currentBlockConfig.parameters.info;

                    // If you get a type error here, it means that a new field was added to the add request
                    // and you need to update the parameters json spec (or set the field to undefined) here.
                    const newObj: TurnOptionalIntoOrUndefined<models.AddOrganizationTransferLearningBlockRequest> = {
                        name: blockName,
                        description: blockDescription,
                        dockerContainer: '',
                        objectDetectionLastLayer: info.objectDetectionLastLayer,
                        imageInputScaling: info.imageInputScaling,
                        operatesOn: info.operatesOn || 'image',
                        indRequiresGpu: info.indRequiresGpu,
                        repositoryUrl: repoUrl,
                        implementationVersion,
                        parameters: currentBlockConfig.parameters.parameters,
                        customModelVariants: info.customModelVariants,
                        isPublic: info.isPublic || false,
                        isPublicForDevices: undefined,
                        publicProjectTierAvailability: info.publicProjectTierAvailability || 'all-projects',
                        displayCategory: info.displayCategory,
                        indBlockNoLongerAvailable: undefined,
                        blockNoLongerAvailableReason: undefined,
                        sourceCodeDownloadStaffOnly: info.sourceCodeDownloadStaffOnly || undefined,
                    };
                    newResponse = await config.api.organizationBlocks.addOrganizationTransferLearningBlock(
                        organizationId, newObj);

                    if (implementationVersion === 1) {
                        console.log('');
                        console.log('\x1b[33mWARN:\x1b[0m This block seems to use --x-file, --y-file and --validation-set-size parameters.');
                        console.log('      These have been replaced by a --data-directory parameter, which already contains');
                        console.log('      pre-splitted data. We recommend you update this training script, see');
                        console.log('');
                        console.log('      https://docs.edgeimpulse.com/docs/edge-impulse-studio/learning-blocks/adding-custom-learning-blocks');
                        console.log('');
                        console.log('      After updating your script, make sure to set "implementation version" to "2" for this block on:');

                        let link = organizationNameResponse.organization.isDeveloperProfile ?
                            `/studio/profile/custom-blocks` :
                            `/organization/${organizationId}/machine-learning`;
                        link = `${studioUrl}${link}`;

                        console.log('');
                        console.log('      ' + link);
                        console.log('');
                    }
                }
                else {
                    console.error(`Unable to upload your block - unknown block type: ` +
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        `${(<any>currentBlockConfig).type}`);
                    process.exit(1);
                }

                currentBlockConfig.config.id = newResponse.id;
                await blockConfigManager.saveConfig(currentBlockConfig.config);
            }
            else {
                if (currentBlockConfig.type === 'machine-learning' || currentBlockConfig.type === 'transform' ||
                    currentBlockConfig.type === 'ai-action' || currentBlockConfig.type === 'synthetic-data' ||
                    currentBlockConfig.type === 'deploy'
                ) {
                    let currParams: { }[] | undefined;
                    if (currentBlockConfig.type === 'machine-learning') {
                        currParams = (await config.api.organizationBlocks.getOrganizationTransferLearningBlock(
                            organizationId, currentBlockConfig.config.id)).transferLearningBlock.parameters;
                    }
                    else if (currentBlockConfig.type === 'transform' ||
                             currentBlockConfig.type === 'synthetic-data' ||
                             currentBlockConfig.type === 'ai-action'
                    ) {
                        const currBlock = (await config.api.organizationBlocks.getOrganizationTransformationBlock(
                            organizationId, currentBlockConfig.config.id)).transformationBlock;

                        const newEnvVars = await getEnvVariablesForBlock(currentBlockConfig.parameters, currBlock);
                        if (newEnvVars) {
                            await config.api.organizationBlocks.updateOrganizationTransformationBlock(
                                organizationId, currentBlockConfig.config.id, {
                                    environmentVariables: newEnvVars,
                                }
                            );
                        }

                        currParams = currBlock.parameters;
                    }
                    else if (currentBlockConfig.type === 'deploy') {
                        currParams = (await config.api.organizationBlocks.getOrganizationDeployBlock(
                            organizationId, currentBlockConfig.config.id)).deployBlock.parameters;
                    }

                    let shouldOverwrite = true;

                    if (currParams && currParams.length !== 0) {
                        if (!deepCompare(currentBlockConfig.parameters.parameters, currParams)) {
                            console.log('');
                            console.log('Your current parameters.json differs from the parameters for this block.');
                            console.log('Remote block config:');
                            console.log(JSON.stringify(currParams, null, 4).split('\n').map(x => '    ' + x).join('\n'));
                            console.log('Local parameters.json:');
                            console.log(JSON.stringify(currentBlockConfig.parameters.parameters, null, 4)
                                .split('\n').map(x => '    ' + x).join('\n'));
                            console.log('');
                            shouldOverwrite = <boolean>(await inquirer.prompt([{
                                type: 'confirm',
                                name: 'overwrite',
                                message: 'Do you want to override the parameters?',
                            }])).overwrite;
                        }
                    }
                    shouldOverwriteParamsAfterPush = shouldOverwrite;
                }

                let diffedProps: { prop: string, oldVal: any, newVal: any }[] = [];
                if (currentBlockConfig.type === 'deploy') {
                    diffedProps = await updateRemoteBlock.getDiffedPropertiesForDeployBlock(
                        organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'dsp') {
                    diffedProps = await updateRemoteBlock.getDiffedPropertiesForDSPBlock(
                        organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'machine-learning') {
                    diffedProps = await updateRemoteBlock.getDiffedPropertiesForMLBlock(
                        organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'synthetic-data') {
                    diffedProps = await updateRemoteBlock.getDiffedPropertiesForSyntheticDataBlock(
                        organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'ai-action') {
                    diffedProps = await updateRemoteBlock.getDiffedPropertiesForAIActionBlock(
                        organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'transform') {
                    diffedProps = await updateRemoteBlock.getDiffedPropertiesForTransformBlock(
                        organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }

                if (diffedProps.length > 0) {
                    console.log('');
                    console.log('Your current local config (in parameters.json info section) differs from the remote config for this block:');
                    for (const prop of diffedProps) {
                        let oldValStr = typeof prop.oldVal === 'undefined' ? 'N/A' : JSON.stringify(prop.oldVal);
                        let newValStr = typeof prop.newVal === 'undefined' ? 'N/A' : JSON.stringify(prop.newVal);
                        console.log(`    ${prop.prop}: remote=${oldValStr}, local=${newValStr}`);
                    }
                    console.log('');
                    shouldOverwriteConfigAfterPush = <boolean>(await inquirer.prompt([{
                        type: 'confirm',
                        name: 'overwrite',
                        message: 'Do you want to override the remote config with your local values?',
                    }])).overwrite;
                }
            }

            // Tar & compress the file & push to the endpoint
            const packagePath = Path.join(os.tmpdir(), `ei-${currentBlockConfig.type}-block-` +
                crypto.randomBytes(16).toString("hex") + '.tar.gz');

            // Create the new tarfile
            console.log(`Archiving '${cwd}'...`);

            // read dockerignore file
            const ignore = dockerignore().add([ '.git/', '.hg/' ]);

            // Check to see if there is an ignore file
            if (await pathExists(dockerignorePath)) {
                try {
                    const ignoreFile = (await fs.promises.readFile(dockerignorePath)).toString('utf-8');
                    ignore.add(ignoreFile.split('\n').map(x => x.trim()));
                }
                catch (ex) {
                    console.warn('Unable to read .dockerignore file', ex);
                }
            }
            const compressCurrentDirectory = new Promise((resolve, reject) => {
                compress({ gzip: true, follow: true, filter: (path) => {
                    const relativePath = Path.relative('.', path);
                    if (relativePath && ignore.ignores(relativePath)) {
                        return false;
                    }

                    return true;
                } }, [ '.' ])
                    .pipe(fs.createWriteStream(packagePath))
                    .on('error', reject)
                    .on('close', resolve);
            });
            await compressCurrentDirectory;

            // Check the size of the file
            const fileSize = (await fs.promises.stat(packagePath)).size;
            if (fileSize > 400 * 1000 * 1000) {
                console.error('Your custom block exceeds the block size limit of 400MB. If your archive includes ' +
                    ' unwanted files, add a .dockerignore file to list files that will be ignored when compressing your ' +
                    'block. If you need large binary files in this block, then download them in your Dockerfile.');
                process.exit(1);
            }
            console.log(`Archiving '${cwd}' OK (${bytesToSize(fileSize)})`,
                packagePath);
            console.log('');

            // Push the file to the endpoint
            console.log(`Uploading block '${blockName}' to organization '${organizationName}'...`);
            let data = await fs.promises.readFile(packagePath);
            const tarFile: RequestDetailedFile = {
                value: data,
                options: {
                    filename: packagePath,
                    contentType: 'application/octet-stream'
                }
            };

            let uploadType: models.UploadCustomBlockRequestTypeEnum;
            switch (currentBlockConfig.type) {
                case 'dsp':
                    uploadType = 'dsp';
                    break;
                case 'deploy':
                    uploadType = 'deploy';
                    break;
                case 'machine-learning':
                    uploadType = 'transferLearning';
                    break;
                case 'transform':
                case 'synthetic-data':
                case 'ai-action':
                    uploadType = 'transform';
                    break;
                default:
                    throw new Error('Failed to determine uploadType ("' + (<{ type: string }>currentBlockConfig).type + '")');
            }

            let uploadResponse = await config.api.organizationCreateProject.uploadCustomBlock(
                currentBlockConfig.config.organizationId,
                {
                    tar: tarFile,
                    type: uploadType,
                    blockId: currentBlockConfig.config.id || 0
                }
            );

            if (!uploadResponse.success || !uploadResponse.id) {
                console.error(`Unable to upload your ${currentBlockConfig.type} block:`, uploadResponse.error);
                process.exit(1);
            }
            let jobId = uploadResponse.id;

            pushingBlockJobId = {
                organizationId: currentBlockConfig.config.organizationId,
                jobId
            };

            console.log(`Uploading block '${blockName}' to organization '${organizationName}' OK`);
            console.log('');

            console.log(`Building ${blockTypeToString(currentBlockConfig.type)} block '${blockName}'...`);

            await config.api.runJobUntilCompletion({
                type: 'organization',
                organizationId: organizationId,
                jobId: jobId
            }, d => {
                process.stdout.write(d);
            });

            await fs.promises.unlink(packagePath);

            pushingBlockJobId = undefined;

            console.log(`Building ${blockTypeToString(currentBlockConfig.type)} block '${blockName}' OK`);
            console.log('');

            // Now update any block parameters
            if (shouldOverwriteParamsAfterPush) {
                console.log('');
                console.log(`INFO: Updating parameters for this block`);
                console.log('');

                if (currentBlockConfig.type === 'machine-learning') {
                    const newBlockObject: models.UpdateOrganizationTransferLearningBlockRequest = {
                        parameters: currentBlockConfig.parameters.parameters,
                    };
                    await config.api.organizationBlocks.updateOrganizationTransferLearningBlock(
                        organizationId, currentBlockConfig.config.id, newBlockObject);
                }
                else if (currentBlockConfig.type === 'transform' ||
                         currentBlockConfig.type === 'synthetic-data' ||
                         currentBlockConfig.type === 'ai-action'
                ) {
                    const newBlockObject: models.UpdateOrganizationTransformationBlockRequest = {
                        parameters: currentBlockConfig.parameters.parameters,
                    };
                    await config.api.organizationBlocks.updateOrganizationTransformationBlock(
                        organizationId, currentBlockConfig.config.id, newBlockObject);
                }
                else if (currentBlockConfig.type === 'deploy') {
                    await config.api.organizationBlocks.updateOrganizationDeployBlock(
                        organizationId, currentBlockConfig.config.id, {
                            parameters: currentBlockConfig.parameters.parameters,
                        });
                }
            }

            if (shouldOverwriteConfigAfterPush && currentBlockConfig.config.id) {
                console.log('');
                console.log(`INFO: Updating config for this block`);
                console.log('');
                if (currentBlockConfig.type === 'deploy') {
                    await updateRemoteBlock.updateDeployBlock(
                        currentBlockConfig.config.organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'dsp') {
                    await updateRemoteBlock.updateDSPBlock(
                        currentBlockConfig.config.organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'machine-learning') {
                    await updateRemoteBlock.updateMLBlock(
                        currentBlockConfig.config.organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'synthetic-data') {
                    await updateRemoteBlock.updateSyntheticDataBlock(
                        currentBlockConfig.config.organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'transform') {
                    await updateRemoteBlock.updateTransformBlock(
                        currentBlockConfig.config.organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
                else if (currentBlockConfig.type === 'ai-action') {
                    await updateRemoteBlock.updateAIActionBlock(
                        currentBlockConfig.config.organizationId,
                        currentBlockConfig.config.id,
                        currentBlockConfig.parameters,
                    );
                }
            }

            if (currentBlockConfig.type === 'transform') {
                const organizationStudioPath = studioUrl + '/organization/' + organizationId + '/data';
                console.log(`Your block has been updated, go to ${organizationStudioPath} to run a new transformation`);
            }
            else if (currentBlockConfig.type === 'synthetic-data') {
                console.log(`Your block has been updated, go to **Data acquisition > Synthetic data** on any project to generate new synthetic data`);
            }
            else if (currentBlockConfig.type === 'ai-action') {
                console.log(`Your block has been updated, go to **Data acquisition > AI labeling** on any project to run your action`);
            }
            else if (currentBlockConfig.type === 'deploy') {
                const organizationStudioPath = studioUrl + '/organization/' + organizationId + '/deployment';
                console.log(`Your block has been updated and is now available on the Deployment page ` +
                    `for every project under ${organizationName}.`);
                console.log(`You can set the block image or update details at ` +
                    organizationStudioPath);
            }
            else if (currentBlockConfig.type === 'dsp') {
                process.stdout.write(`Wait a moment, we're spinning up a container for this DSP block...  `);

                let spinIv = spinner();

                while (1) {
                    let dspStatusRes: models.GetOrganizationDspBlockResponse;
                    try {
                        dspStatusRes = await config.api.organizationBlocks.getOrganizationDspBlock(
                            currentBlockConfig.config.organizationId, currentBlockConfig.config.id);
                    }
                    catch (ex2) {
                        let ex = <Error>ex2;
                        process.stdout.write('\n');
                        console.log('Failed to retrieve DSP block status',
                            ex.message || ex.toString());
                        return process.exit(1);
                    }

                    let block = dspStatusRes.dspBlock;
                    if (block.isConnected) {
                        break;
                    }
                    else if (block.error) {
                        process.stdout.write('\n');
                        console.log('Failed to start container for DSP block:');
                        console.log(block.error);
                        process.exit(1);
                    }

                    // else... not ready yet
                    await sleep(5000);
                }

                clearInterval(spinIv);

                process.stdout.write('\n');
                console.log(`Done... DSP Block "${blockName}" is now available for all projects in your organization!`);
                console.log(`Just head to **Create impulse** and click 'Add processing block' to use this block.`);
            }

            process.exit(0);
        }
        catch (e) {
            console.error('Failed to package block:', e);
            process.exit(1);
        }
    }

    if (runnerCommand) {
        let currentBlockConfig;
        try {
            currentBlockConfig = await blockConfigManager.loadConfig({
                throwOnMissingParams: false,
            });
        }
        catch (ex2) {
            const ex = <Error>ex2;
            console.log(ex.message || ex.toString());
            process.exit(1);
        }

        if (!currentBlockConfig || !currentBlockConfig.config) {
            console.error('A configuration cannot be found for this host (' + config.host + '). ' +
                'Run "edge-impulse-blocks init" to create a new block.');
            process.exit(1);
        }

        // Get the cwd name
        const cwd = Path.basename(process.cwd());

        // Get the organization id
        const organizationId = currentBlockConfig.config.organizationId;

        // Get the organization name
        let organizationNameResponse: models.OrganizationInfoResponse;
        try {
            organizationNameResponse = await config.api.organizations.getOrganizationInfo(organizationId);
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.error(`Unable to find organization ${organizationId}. Does the organization still exist?`);
            console.error('    ' + ex.message || ex.toString());
            console.error('Or, run with --clean to re-authenticate.');
            process.exit(1);
        }

        const blockType = currentBlockConfig.type;

        try {
            let dockerContainerName = `ei-block-${(currentBlockConfig.config.id ? currentBlockConfig.config.id : cwd)}`;

            let options: RunnerOptions = {
                ...runnerOpts,
                container: dockerContainerName,
                type: blockType
            };

            let blockRunner: BlockRunner = await BlockRunnerFactory.getRunner(
                blockType, configFactory, config, currentBlockConfig, options);
            await blockRunner.run();
        }
        catch (ex) {
            let ex2 = <Error>ex;

            console.error('Error while running block: ' + ex2.stack || ex2.toString());
            console.error('Run with --clean to clear state');
            process.exit(1);
        }
    }
    return;
})();

function blockTypeToString(blockType: CLIBlockType): string {
    if (blockType === 'machine-learning') {
        return 'machine learning';
    }
    if (blockType === 'synthetic-data') {
        return 'synthetic data';
    }
    if (blockType === 'ai-action') {
        return 'ai action';
    }

    return blockType;
}

async function getEnvVariablesForBlock(
    block: SyntheticDataBlockParametersJson |
           TransformBlockParametersJson |
           AIActionBlockParametersJson,
    currentBlock: models.OrganizationTransformationBlock | undefined
): Promise<models.EnvironmentVariable[] | undefined> {
    if (!block.info.requiredEnvVariables || block.info.requiredEnvVariables.length === 0) {
        return undefined;
    }

    let missingEnvVariables: string[] = [];
    if (currentBlock) {
        let currEnvVariables = currentBlock.environmentVariables.map(x => x.key);

        // check what env variables we're missing
        missingEnvVariables = block.info.requiredEnvVariables.filter(x => {
            return currEnvVariables.indexOf(x) === -1;
        });
    }
    else {
        missingEnvVariables = block.info.requiredEnvVariables;
    }

    if (missingEnvVariables.length === 0) return undefined;

    let ret: models.EnvironmentVariable[] = [];
    // keep existing ones...
    if (currentBlock) {
        ret = ret.concat(currentBlock.environmentVariables);
    }

    for (let key of missingEnvVariables) {
        let value = (<{ value: string }>await inquirer.prompt([{
            type: 'input',
            message: `This block requires a value for environmental variable ${key}:`,
            name: 'value',
        }])).value;

        ret.push({ key: key, value: value });
    }

    return ret;
}
