#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import Path from 'path';
import os from 'os';
import { Config, EdgeImpulseConfig } from './config';
import checkNewVersions from './check-new-version';
import inquirer from 'inquirer';
import {
    AddOrganizationTransferLearningBlockRequest,
    AddOrganizationTransformationBlockRequest,
    OrganizationJobsApi,
    UploadCustomBlockRequestTypeEnum,
    UploadCustomBlockRequestTypeEnumValues
} from '../sdk/studio/api';
import request from 'request-promise';
import unzip from 'unzipper';
import tar from 'tar';
import crypto from 'crypto';
import WebSocket, { OPEN } from 'ws';
import dockerignore from '@zeit/dockerignore';
import { getCliVersion } from './init-cli-app';
import util from 'util';
import {
    ObjectDetectionLastLayer,
    OrganizationTransferLearningBlockOperatesOnEnum
} from '../sdk/studio/model/models';
import { BlockRunner, BlockRunnerFactory, RunnerOptions } from './block-runner';

const version = getCliVersion();

export type BlockConfigItem = {
    name: string,
    description: string,
    id?: number,
    organizationId: number,
    type: UploadCustomBlockRequestTypeEnum,
} & ({
    type: 'transform',
    operatesOn: 'file' | 'dataitem' | 'standalone' | undefined,
    transformMountpoints: {
        bucketId: number;
        mountPoint: string;
    }[] | undefined,
} | {
    type: 'transferLearning',
    tlOperatesOn?: OrganizationTransferLearningBlockOperatesOnEnum,
    tlObjectDetectionLastLayer?: ObjectDetectionLastLayer,
} | {
    type: 'deploy',
    deployCategory?: 'library' | 'firmware',
} | {
    type: 'dsp',
    port?: number,
});

type BlockConfigV1 = {
    version: 1,
    config: {
        [host: string]: BlockConfigItem
    }
};

interface ExtractedFile {
    path: string;
    autodrain: any;
    pipe: any;
}

type DSPChangedMsg = [string, {
    dspId: number;
    status: 'success' | 'error' | 'in-progress';
    error?: string;
}];

interface RequestDetailedFile {
    value: Buffer;
    options?: {
        filename?: string;
        contentType?: string;
    };
}

export type MessageBlock = [
    string,
    {
        data?: string,
        success?: boolean,
        hello?: { version: number }
    }
];

type DSPBlockOutput = {
    projectId: number;
    dspId: number;
};

const packageVersion = (<{ version: string }>JSON.parse(fs.readFileSync(
    Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;
const configFilePath = '.ei-block-config';

let dockerContainerName: string | undefined;

program
    .description('Create, run, and publish custom blocks')
    .version(packageVersion)
    .option('-c --clean', 'Reset the current user')
    .option('-d --dev', 'Developer mode')
    .option('--api-key <key>', 'API key')
    .allowUnknownOption(false);

const init = program.command('init')
            .description('Initialize the current folder as a new block');

const info = program.command('info', { isDefault: true })
            .description('Output information about the local block');

const push = program.command('push')
            .description('Push the current block to Edge Impulse')
            .option('--port <number>', 'Port that the DSP block is listening on', '4446');

const runner = program.command('runner')
               .description('Run the current block locally')
               .option('--dataset <dataset>', 'Tranformation block: Name of dataset')
               .option('--data-item <dataItem>', 'Tranformation block: Name of data item')
               .option('--file <filename>', 'File tranformation block: Name of file in data item')
               .option('--epochs <number>', 'Transfer learning: # of epochs to train')
               .option('--learning-rate <learningRate>', 'Transfer learning: Learning rate while training')
               .option('--validation-set-size <size>', 'Transfer learning: Size of validation set')
               .option('--input-shape <shape>', 'Transfer learning: List of axis dimensions. Example: "(1, 4, 2)"')
               .option('--download-data', 'Transfer learning or deploy: Only download data and don\'t run the block')
               .option('--port <number>', 'DSP: Port to host DSP block on')
               .option('--extra-args <args>', 'Pass extra arguments/options to the Docker container')
               .option('--skip-download', `Tranformation block: Don't download data`);

program.parse(process.argv);

const initCommand = program.args[0] === 'init';
const infoCommand = program.args[0] === 'info';
const pushCommand = program.args[0] === 'push';
const runnerCommand = program.args[0] === 'runner';

const cleanArgv = !!program.clean;
const devArgv = !!program.dev;
const apiKeyArgv = program.apiKey ? <string>program.apiKey : undefined;
let portArgv: string | undefined;

const runnerOpts = runner.opts();
if (runnerCommand) {
    portArgv = runnerOpts.port ? <string>runnerOpts.port : undefined;
}
else if (pushCommand) {
    const pushOpts = push.opts();
    portArgv = pushOpts.port ? <string>pushOpts.port : undefined;
}

const dockerfilePath = Path.join(process.cwd(), 'Dockerfile');
const dockerignorePath = Path.join(process.cwd(), '.dockerignore');

let globalCurrentBlockConfig: BlockConfigV1 | undefined;

// tslint:disable-next-line:no-floating-promises
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
            else {
                console.log('Stored token seems invalid, clearing cache...', ex);
            }
            await configFactory.clean();
            config = await configFactory.verifyLogin(devArgv, apiKeyArgv, apiKeyArgv ? 'org' : 'project');
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

    if (!initCommand && !pushCommand && !runnerCommand && !infoCommand) {
        console.log('Specify a command:');
        console.log('\tinit: Initialize the current folder as a new block');
        console.log('\tinfo: Print information about current block');
        console.log('\tpush: Push the current folder to the server');
        console.log('\trunner: Run the current block locally');
        return;
    }

    if (!config) return;

    if (initCommand) {
        // Initialize the current folder as a new block

        // Check if a config file already exists
        if (await checkConfigFile(config.host) && globalCurrentBlockConfig?.config[config.host]) {
            console.log('A block already exists in this location. Please delete it or use "push" to push it.');
            process.exit(1);
        }

        // Select the organization
        let organizations = await config.api.organizations.listOrganizations();
        let organizationId: number;
        if (!organizations.body.success) {
            console.error('Cannot retrieve organizations:', organizations.body.error);
            process.exit(1);
        }
        if (!organizations.body.organizations || organizations.body.organizations.length === 0) {
            console.error('User is not part of any Edge Impulse organizations. You can only use custom blocks if ' +
                'you have access to the enterprise version of Edge Impulse. You can log in with a new account via ' +
                '`edge-impulse-blocks --clean`.');
            process.exit(1);
        }
        else if (organizations.body.organizations && organizations.body.organizations.length === 1) {
            organizationId = organizations.body.organizations[0].id;
        }
        else {
            let orgInqRes = await inquirer.prompt([{
                type: 'list',
                choices: (organizations.body.organizations || []).map(p => ({ name: p.name, value: p.id })),
                name: 'organization',
                message: 'In which organization do you want to create this block?',
                pageSize: 20
            }]);
            organizationId = Number(orgInqRes.organization);
        }
        let organization = organizations.body.organizations.filter(org => org.id === organizationId)[0];

        console.log(`Attaching block to organization '${organization.name}'`);

        // Select the type of block
        let blockType: UploadCustomBlockRequestTypeEnum;
        let blockTypeInqRes = await inquirer.prompt([{
            type: 'list',
            choices: [
                {
                    name: 'Transformation block',
                    value: 'transform'
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
                    value: 'transferLearning'
                }
            ],
            name: 'type',
            message: 'Choose a type of block',
            pageSize: 20
        }]);
        blockType = <UploadCustomBlockRequestTypeEnum>blockTypeInqRes.type;

        let blockId: number | undefined;
        let blockName: string | undefined;
        let blockDescription: string | undefined;
        let blockOperatesOn: 'file' | 'dataitem' | 'standalone' | undefined;
        let blockTlOperatesOn: OrganizationTransferLearningBlockOperatesOnEnum | undefined;
        let blockTlObjectDetectionLastLayer: ObjectDetectionLastLayer | undefined;
        let transformMountpoints: {
            bucketId: number;
            mountPoint: string;
        }[] | undefined;

        let deployCategory: 'library' | 'firmware' | undefined;

        // Fetch all relevant existing blocks so the user can select an existing block to update
        let existingBlocks: {
            name: string, value: number, block: {
                description: string, name: string, operatesOn: 'file' | 'dataitem' | 'standalone' | undefined }
            }[] = [];
        if (blockType === 'transform') {
            let blocks = await config.api.organizationBlocks.listOrganizationTransformationBlocks(organizationId);
            if (blocks.body && blocks.body.transformationBlocks && blocks.body.transformationBlocks.length > 0) {
                existingBlocks = blocks.body.transformationBlocks.map(p => (
                    {
                        name: p.name,
                        value: p.id,
                        block: { description: p.description, name: p.name, operatesOn: p.operatesOn }
                    }
                ));
            }
        }
        else if (blockType === 'deploy') {
            let blocks = await config.api.organizationBlocks.listOrganizationDeployBlocks(organizationId);
            if (blocks.body && blocks.body.deployBlocks && blocks.body.deployBlocks.length > 0) {
                existingBlocks = blocks.body.deployBlocks.map(p => (
                    {
                        name: p.name,
                        value: p.id,
                        block: { description: p.description, name: p.name, operatesOn: undefined }
                    }
                ));
            }
        }
        else if (blockType === 'dsp') {
            let blocks = await config.api.organizationBlocks.listOrganizationDspBlocks(organizationId);
            if (blocks.body && blocks.body.dspBlocks && blocks.body.dspBlocks.length > 0) {
                existingBlocks = blocks.body.dspBlocks.map(p => (
                    {
                        name: p.name,
                        value: p.id,
                        block: { description: p.description, name: p.name, operatesOn: undefined }
                    }
                ));
            }
        }
        else if (blockType === 'transferLearning') {
            let blocks = await config.api.organizationBlocks.listOrganizationTransferLearningBlocks(organizationId);
            if (blocks.body && blocks.body.transferLearningBlocks && blocks.body.transferLearningBlocks.length > 0) {
                existingBlocks = blocks.body.transferLearningBlocks.map(p => (
                    {
                        name: p.name,
                        value: p.id,
                        block: { description: p.description, name: p.name, operatesOn: undefined }
                    }
                ));
            }
        }
        else {
            console.error(`Invalid block type: ${blockTypeInqRes.type}`);
            process.exit(1);
        }

        // If no blocks exist, force create
        let createOrUpdateInqRes = existingBlocks.length > 0 ? (await inquirer.prompt([{
            type: 'list',
            choices: [
                {
                    name: 'Create a new block',
                    value: 'create'
                },
                {
                    name: 'Update an existing block',
                    value: 'update'
                }
            ],
            name: 'option',
            message: 'Choose an option',
            pageSize: 20
        }])).option : 'create';

        if (createOrUpdateInqRes === 'update') {
            // Update an existing block
            // Choose a block ID
            let blockChoiceInqRes = await inquirer.prompt([{
                type: 'list',
                choices: existingBlocks,
                name: 'id',
                message: 'Choose a block to update',
                pageSize: 20
            }]);
            blockId = Number(blockChoiceInqRes.id);
            const selectedBlock = existingBlocks.filter(block => block.value === blockId)[0];
            if (selectedBlock) {
                blockDescription = selectedBlock.block.description;
                blockName = selectedBlock.block.name;
                blockOperatesOn = selectedBlock.block.operatesOn;
            }
        }

        let defaultName = 'My new block';
        let defaultDescription: string | undefined;

        if (blockType === 'dsp') {
            let paramsFile = Path.join(process.cwd(), 'parameters.json');
            if (paramsFile) {
                try {
                    let pf = (await fs.promises.readFile(paramsFile)).toString('utf-8');
                    let p = <{ info: { name: string, description: string } }>JSON.parse(pf);
                    if (p.info && p.info.name) {
                        defaultName = p.info.name;
                    }
                    if (p.info && p.info.description) {
                        defaultDescription = p.info.description;
                    }
                }
                catch (ex) {
                    // noop
                }
            }
        }

        // Enter block name
        if (!blockName || blockName.length < 2) {
            blockName = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'name',
                message: 'Enter the name of your block',
                default: defaultName
            }])).name;
            if (blockName.length < 2) {
                console.error('New block must have a name longer than 2 characters.');
                process.exit(1);
            }
        }

        // Enter block description
        if (!blockDescription || blockDescription.length < 2) {
            blockDescription = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'description',
                message: 'Enter the description of your block',
                default: defaultDescription
            }])).description;
            if (blockDescription === '') blockDescription = blockName;
        }

        if (createOrUpdateInqRes === 'create' && blockType === 'transform') {
            blockOperatesOn = <'file' | 'dataitem' | 'standalone'>(await inquirer.prompt([{
                type: 'list',
                name: 'operatesOn',
                choices: [
                    {
                        name: 'File (--in-file passed into the block)',
                        value: 'file'
                    },
                    {
                        name: 'Data item (--in-directory passed into the block)',
                        value: 'dataitem'
                    },
                    {
                        name: 'Standalone (runs the container, but no files / data items passed in)',
                        value: 'standalone'
                    }
                ],
                message: 'What type of data does this block operate on?',
            }])).operatesOn;

            let buckets = await config.api.organizationData.listOrganizationBuckets(organizationId);
            if (buckets.body && buckets.body.buckets && buckets.body.buckets.length > 0) {
                transformMountpoints = (<string[]>(await inquirer.prompt([{
                    type: 'checkbox',
                    name: 'buckets',
                    choices: buckets.body.buckets.map(x => {
                        return {
                            name: x.name,
                            value: x.id.toString()
                        };
                    }),
                    message: 'Which buckets do you want to mount into this block ' +
                        '(will be mounted under /mnt/s3fs/BUCKET_NAME, you can change these mount points in the Studio)?',
                }])).buckets).map(y => {
                    let b = buckets.body.buckets?.find(z => z.id === Number(y));
                    return {
                        bucketId: Number(y),
                        mountPoint: b ? ('/mnt/s3fs/' + b?.name) : '',
                    };
                }).filter(x => !!x.mountPoint && !isNaN(x.bucketId));
            }
        }

        if (createOrUpdateInqRes === 'create' && blockType === 'transferLearning') {
            blockTlOperatesOn = <OrganizationTransferLearningBlockOperatesOnEnum>(await inquirer.prompt([{
                type: 'list',
                name: 'operatesOn',
                choices: [
                    {
                        name: 'Object Detection',
                        value: 'object_detection'
                    },
                    {
                        name: 'Image classification',
                        value: 'image'
                    },
                    {
                        name: 'Audio classification',
                        value: 'audio'
                    },
                    {
                        name: 'Other (classification)',
                        value: 'other'
                    },
                    {
                        name: 'Other (regression)',
                        value: 'regression'
                    },
                ],
                message: 'What type of data does this model operate on?',
            }])).operatesOn;

            if (blockTlOperatesOn === 'object_detection') {
                blockTlObjectDetectionLastLayer = <ObjectDetectionLastLayer>
                    (await inquirer.prompt([{
                        type: 'list',
                        name: 'lastLayer',
                        choices: [
                            {
                                name: 'MobileNet SSD',
                                value: 'mobilenet_ssd'
                            },
                            {
                                name: 'Edge Impulse FOMO',
                                value: 'fomo'
                            },
                            {
                                name: 'YOLOv5',
                                value: 'yolov5'
                            },
                        ],
                        message: `What's the last layer of this object detection model?`,
                    }])).lastLayer;
            }
        }


        if (createOrUpdateInqRes === 'create' && blockType === 'deploy') {
            deployCategory = <'library' | 'firmware'>(await inquirer.prompt([{
                type: 'list',
                name: 'category',
                choices: [
                    {
                        name: 'Library',
                        value: 'library'
                    },
                    {
                        name: 'Firmware',
                        value: 'firmware'
                    }
                ],
                message: 'Where to show this deployment block in the UI?',
            }])).category;
        }

        // Create & write the config
        globalCurrentBlockConfig = globalCurrentBlockConfig || { version: 1, config: { } };
        globalCurrentBlockConfig.config[config.host] = blockId ? {
            name: blockName,
            id: blockId,
            type: blockType,
            description: blockDescription,
            organizationId,
            operatesOn: blockOperatesOn,
            tlObjectDetectionLastLayer: blockTlObjectDetectionLastLayer,
            tlOperatesOn: blockTlOperatesOn,
            deployCategory: deployCategory,
            transformMountpoints: transformMountpoints,
        } : {
            name: blockName,
            type: blockType,
            description: blockDescription,
            organizationId,
            operatesOn: blockOperatesOn,
            tlObjectDetectionLastLayer: blockTlObjectDetectionLastLayer,
            tlOperatesOn: blockTlOperatesOn,
            deployCategory: deployCategory,
            transformMountpoints: transformMountpoints,
        };

        // console.log('Creating block with config:', globalCurrentBlockConfig);
        await writeConfigFile();

        const hasDockerFile = await exists(dockerfilePath);

        if (createOrUpdateInqRes === 'create' && !hasDockerFile &&
            (blockType === 'transform' || blockType === 'deploy')) {

            // Fetch the example files
            let fetchInqRes = await inquirer.prompt([{
                type: 'list',
                choices: ['yes', 'no'],
                name: 'option',
                message: 'Would you like to download and load the example repository?',
                pageSize: 20
            }]);

            // Get the correct example repository path
            let templateSourcePath: string;
            let directoryRoot: string;
            if (blockType === 'transform') {
                templateSourcePath =
                    'https://github.com/edgeimpulse/template-transformation-block-python/archive/main.zip';
                directoryRoot = 'template-transformation-block-python-main/';
            }
            else if (blockType === 'deploy') {
                templateSourcePath = 'https://github.com/edgeimpulse/template-deployment-block/archive/main.zip';
                directoryRoot = 'template-deployment-block-main/';
            }
            else {
                console.error(`Invalid block type: ${blockType}`);
                process.exit(1);
            }

            if (fetchInqRes.option === 'yes') {
                try {
                    const data = await request(templateSourcePath)
                        .pipe(unzip.Parse())
                        .on('entry', async (entry: ExtractedFile) => {
                            // To unzip in the current directory:
                            const newFilename = entry.path.replace(directoryRoot, './');
                            let subdirectories = entry.path.split('/');
                            // Ignore folders
                            if (subdirectories[subdirectories.length - 1] === '') {
                                // tslint:disable-next-line: no-unsafe-any
                                entry.autodrain();
                            }
                            else {
                                // Remove the root and filename and create any subdirectories
                                if (subdirectories.length > 2) {
                                    subdirectories = subdirectories.slice(1, subdirectories.length - 1);
                                    const newDirectory = subdirectories.join('/');
                                    await fs.promises.mkdir(newDirectory, { recursive: true });
                                }
                                // tslint:disable-next-line: no-unsafe-any
                                entry.pipe(fs.createWriteStream(newFilename));
                            }
                        })
                        .promise();
                    console.log('Template repository fetched!');
                }
                catch (e) {
                    console.warn('Unable to fetch the repository:', e);
                    console.log('You can fetch the template later from', templateSourcePath);
                }
            } else {
                console.log('You can fetch the template later from', templateSourcePath);
            }
        }
        console.log(`Your new block '${blockName}' has been created in '${process.cwd()}'.`);
        console.log(`When you have finished building your ${blockTypeInqRes.type} block, run 'edge-impulse-blocks ` +
            `push' to update the block in Edge Impulse.`);
        process.exit(0);
    }

    if (pushCommand) {
        // Tar & compress the repository and push to the endpoint
        // Check if a config file exists
        if (!await checkConfigFile(config.host) || !globalCurrentBlockConfig) {
            console.error('A config file cannot be found. Run "edge-impulse-blocks init" to create a new block.');
            process.exit(1);
        }

        let currentBlockConfig = globalCurrentBlockConfig.config[config.host];
        if (!currentBlockConfig) {
            console.error('A configuration cannot be found for this host (' + config.host + '). ' +
                'Run "edge-impulse-blocks init" to create a new block.');
            process.exit(1);
        }

        if (!UploadCustomBlockRequestTypeEnumValues.includes(currentBlockConfig.type)) {
            console.error(`Unable to upload your block - unknown block type: ${currentBlockConfig.type}`);
            process.exit(1);
        }

        // Get the cwd name
        const cwd = Path.basename(process.cwd());

        // Get the organization id
        const organizationId = currentBlockConfig.organizationId;
        // Get the organization name
        const organizationNameResponse = await config.api.organizations.getOrganizationInfo(organizationId);
        if (!organizationNameResponse.body.success || !organizationNameResponse.body.organization.name) {
            console.error(`Unable to find organization ${organizationId}. Does the organization still exist?`);
            process.exit(1);
        }
        const organizationName = organizationNameResponse.body.organization.name;

        try {
            if (!currentBlockConfig.id)  {
                // Create a new block
                let newResponse: { body: { success: boolean, id: number, error?: string }};
                if (currentBlockConfig.type === 'transform') {
                    const newBlockObject: AddOrganizationTransformationBlockRequest = {
                        name: currentBlockConfig.name,
                        description: currentBlockConfig.description,
                        dockerContainer: '',
                        indMetadata: true,
                        cliArguments: '',
                        operatesOn: currentBlockConfig.operatesOn || 'file',
                        additionalMountPoints: (currentBlockConfig.transformMountpoints || []).map(x => {
                            return {
                                type: 'bucket',
                                bucketId: x.bucketId,
                                mountPoint: x.mountPoint,
                            };
                        }),
                    };
                    newResponse = await config.api.organizationBlocks.addOrganizationTransformationBlock(
                        organizationId, newBlockObject);
                }
                else if (currentBlockConfig.type === 'deploy') {
                    newResponse = await config.api.organizationBlocks.addOrganizationDeployBlock(
                        organizationId, currentBlockConfig.name, '', currentBlockConfig.description, '',
                        undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
                        undefined, undefined, currentBlockConfig.deployCategory);
                }
                else if (currentBlockConfig.type === 'dsp') {
                    if (currentBlockConfig.type === 'dsp' && typeof currentBlockConfig.port !== 'number') {
                        let port: number;
                        if (portArgv) {
                            port = Number(portArgv);
                            if (isNaN(port)) {
                                console.error(`Invalid value for --port, should be a number, but was "${portArgv}"`);
                                process.exit(1);
                            }
                        }
                        else {
                            let defaultChoice: number | undefined;

                            if (await exists(dockerfilePath)) {
                                let dockerfileLines = (await fs.promises.readFile(dockerfilePath))
                                    .toString('utf-8').split('\n');
                                let exposeLine = dockerfileLines.find(x => x.toLowerCase().startsWith('expose'));
                                let exposePort = Number(exposeLine?.toLowerCase().replace('expose ', ''));
                                defaultChoice = exposePort;
                            }

                            let portRes = await inquirer.prompt([{
                                type: 'number',
                                name: 'port',
                                message: 'What port is your block listening on?',
                                default: defaultChoice
                            }]);
                            port = Number(portRes.port);
                            if (isNaN(port)) {
                                console.error(`Invalid value for port, should be a number, but was "${portRes.port}"`);
                                process.exit(1);
                            }
                        }

                        currentBlockConfig.port = port;
                        await writeConfigFile();
                    }

                    newResponse = await config.api.organizationBlocks.addOrganizationDspBlock(
                        organizationId, {
                            name: currentBlockConfig.name,
                            dockerContainer: '',
                            description: currentBlockConfig.description,
                            port: currentBlockConfig.port || 80,
                        });
                }
                else if (currentBlockConfig.type === 'transferLearning') {
                    const newBlockObject: AddOrganizationTransferLearningBlockRequest = {
                        name: currentBlockConfig.name,
                        description: currentBlockConfig.description,
                        dockerContainer: '',
                        objectDetectionLastLayer:
                            <ObjectDetectionLastLayer>currentBlockConfig.tlObjectDetectionLastLayer,
                        operatesOn: currentBlockConfig.tlOperatesOn || 'image',
                    };
                    newResponse = await config.api.organizationBlocks.addOrganizationTransferLearningBlock(
                        organizationId, newBlockObject);
                }
                else {
                    console.error(`Unable to upload your block - unknown block type: ` +
                        `${(<any>currentBlockConfig).type}`);
                    process.exit(1);
                }
                if (!newResponse.body.success) {
                    console.error('Unable to add the block to your organization: ', newResponse.body.error);
                    process.exit(1);
                }

                currentBlockConfig.id = newResponse.body.id;
                await writeConfigFile();
            }

            // Tar & compress the file & push to the endpoint
            const packagePath = Path.join(os.tmpdir(), `ei-${currentBlockConfig.type}-block-` +
                crypto.randomBytes(16).toString("hex") + '.tar.gz');

            // Create the new tarfile
            console.log(`Archiving '${cwd}'...`);

            // read dockerignore file
            const ignore = dockerignore().add([ '.git/', '.hg/' ]);

            // Check to see if there is an ignore file
            if (await exists(dockerignorePath)) {
                try {
                    const ignoreFile = (await fs.promises.readFile(dockerignorePath)).toString('utf-8');
                    ignore.add(ignoreFile.split('\n').map(x => x.trim()));
                }
                catch (ex) {
                    console.warn('Unable to read .dockerignore file', ex);
                }
            }
            const compressCurrentDirectory = new Promise((resolve, reject) => {
                tar.c({ gzip: true, follow: true, filter: (path) => {
                    if (ignore.ignores(path)) {
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
                    'block.');
                process.exit(1);
            }
            console.log(`Archiving '${cwd}' OK (${bytesToSize(fileSize)})`,
                packagePath);
            console.log('');

            // Push the file to the endpoint
            console.log(`Uploading block '${currentBlockConfig.name}' to organization '${organizationName}'...`);
            let data = await fs.promises.readFile(packagePath);
            const tarFile: RequestDetailedFile = {
                value: data,
                options: {
                    filename: packagePath,
                    contentType: 'application/octet-stream'
                }
            };

            let uploadResponse = await config.api.organizationCreateProject.uploadCustomBlock(
                currentBlockConfig.organizationId,
                tarFile,
                currentBlockConfig.type,
                currentBlockConfig.id || 0
            );

            if (!uploadResponse.body.success || !uploadResponse.body.id) {
                console.error(`Unable to upload your ${currentBlockConfig.type} block:`, uploadResponse.body.error);
                process.exit(1);
            }
            let jobId = uploadResponse.body.id;
            console.log(`Uploading block '${currentBlockConfig.name}' to organization '${organizationName}' OK`);
            console.log('');

            async function connectToSocket() {
                if (!config) return;

                // Get a websocket
                const socket: WebSocket = await getWebsocket(organizationId, config.api.organizationJobs,
                    config.endpoints.internal.api);

                let pingIv = setInterval(() => {
                    if (socket && socket.readyState === OPEN) {
                        socket.ping();
                    }
                }, 5000);

                socket.onmessage = (msg: WebSocket.MessageEvent) => {
                    try {
                        let m = <MessageBlock>JSON.parse(msg.data.toString().replace(/^[0-9]+/, ''));
                        if (m[0] !== `job-data-${jobId}` && m[0] !== `job-finished-${jobId}`) return;
                        if (m[1].data) {
                            process.stdout.write(m[1].data);
                        }
                    }
                    catch (e) {
                        /* noop */
                    }
                };

                socket.onclose = () => {
                    clearInterval(pingIv);

                    // console.log('Socket closed... connecting to new socket...');

                    // tslint:disable-next-line: no-floating-promises
                    connectToSocket();
                };
            }

            console.log(`Building ${currentBlockConfig.type} block '${currentBlockConfig.name}'...`);
            await connectToSocket();

            while (1) {
                await sleep(5000);

                let jobInfoRes = await config.api.organizationJobs.getOrganizationJobStatus(
                    currentBlockConfig.organizationId, jobId);

                if (!jobInfoRes.body.success || !jobInfoRes.body.job) {
                    console.log('Failed to retrieve job status', jobInfoRes.body.error || jobInfoRes.response);
                    continue;
                }

                let job = jobInfoRes.body.job;
                if (job.finishedSuccessful === true) {
                    break;
                }
                else if (job.finishedSuccessful === false) {
                    console.log('Job failed, see above');
                    process.exit(1);
                }
            }

            await fs.promises.unlink(packagePath);

            console.log(`Building ${currentBlockConfig.type} block '${currentBlockConfig.name}' OK`);
            console.log('');

            if (currentBlockConfig.type === 'transform') {
                const organizationStudioPath = config.endpoints.internal.api.replace('/v1', '') + '/organization/' +
                    organizationId + '/data';
                console.log(`Your block has been updated, go to ${organizationStudioPath} to run a new transformation`);
            }
            else if (currentBlockConfig.type === 'deploy') {
                const organizationStudioPath = config.endpoints.internal.api.replace('/v1', '') + '/organization/' +
                organizationId + '/deployment';
                console.log(`Your block has been updated and is now available on the Deployment page ` +
                    `for every project under ${organizationName}.`);
                console.log(`You can set the block image or update details at ` +
                    organizationStudioPath);
            }
            else if (currentBlockConfig.type === 'dsp') {
                process.stdout.write(`Wait a moment, we're spinning up a container for this DSP block...  `);

                let spinIv = spinner();

                while (1) {
                    let dspStatusRes = await config.api.organizationBlocks.listOrganizationDspBlocks(
                        currentBlockConfig.organizationId);
                    if (!dspStatusRes.body.success || !dspStatusRes.body.dspBlocks) {
                        process.stdout.write('\n');
                        console.log('Failed to retrieve DSP block status',
                            dspStatusRes.body.error || dspStatusRes.response);
                        process.exit(1);
                    }

                    let block = dspStatusRes.body.dspBlocks.find(d => d.id === currentBlockConfig.id);
                    if (!block) {
                        process.stdout.write('\n');
                        console.log('Failed to find DSP block with ID ' + currentBlockConfig.id + ' in response:',
                            dspStatusRes.body);
                        process.exit(1);
                    }
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
            }

            process.stdout.write('\n');
            console.log(`Done... DSP Block "${currentBlockConfig.name}" is now available for all projects in your organization!`);
            console.log(`Just head to **Create impulse** and click 'Add processing block' to use this block.`);

            process.exit(0);
        }
        catch (e) {
            console.error('Failed to package block:', e);
            process.exit(1);
        }
    }

    if (runnerCommand) {
        // Check if a config file exists
        if (!await checkConfigFile(config.host) || !globalCurrentBlockConfig) {
            console.error('A config file cannot be found. Run "edge-impulse-blocks init" to create a new block.');
            process.exit(1);
        }

        let currentBlockConfig = globalCurrentBlockConfig.config[config.host];
        if (!currentBlockConfig) {
            console.error('A configuration cannot be found for this host (' + config.host + '). ' +
                'Run "edge-impulse-blocks init" to create a new block.');
            process.exit(1);
        }

        if (!UploadCustomBlockRequestTypeEnumValues.includes(currentBlockConfig.type)) {
            console.error(`Unable to run your block - unknown block type: ${currentBlockConfig.type}`);
            process.exit(1);
        }

        // Get the cwd name
        const cwd = Path.basename(process.cwd());

        // Get the organization id
        const organizationId = currentBlockConfig.organizationId;
        // Get the organization name
        const organizationNameResponse = await config.api.organizations.getOrganizationInfo(organizationId);
        if (!organizationNameResponse.body.success || !organizationNameResponse.body.organization.name) {
            console.error(`Unable to find organization ${organizationId}. Does the organization still exist?`);
            process.exit(1);
        }
        const blockType = currentBlockConfig.type;

        try {
            dockerContainerName = `ei-block-${(currentBlockConfig.id ? currentBlockConfig.id : cwd)}`;

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
            process.exit(1);
        }
    }

    if (infoCommand) {
        // Check if a config file exists
        if (!await checkConfigFile(config.host) || !globalCurrentBlockConfig) {
            console.error('A config file cannot be found. Run "edge-impulse-blocks init" to create a new block.');
            process.exit(1);
        }

        let currentBlockConfig = globalCurrentBlockConfig.config[config.host];
        if (!currentBlockConfig) {
            console.error('A configuration cannot be found for this host (' + config.host + '). ' +
                'Run "edge-impulse-blocks init" to create a new block.');
            process.exit(1);
        }

        if (!UploadCustomBlockRequestTypeEnumValues.includes(currentBlockConfig.type)) {
            console.error(`Unable to parse your block - unknown block type: ${currentBlockConfig.type}`);
            process.exit(1);
        }

        try {
            console.log(`Name: ${currentBlockConfig.name}\nDescription: ${currentBlockConfig.description}\n` +
                        `Organization ID: ${currentBlockConfig.organizationId}\n${(currentBlockConfig.id ? `ID: ${currentBlockConfig.id}` : 'Not pushed')}\n` +
                        `Block type: ${currentBlockConfig.type}`);
            switch (currentBlockConfig.type) {
                case 'transform':
                    console.log(`Operates on: ${currentBlockConfig.operatesOn}\nBucket mount points:`);
                    if (currentBlockConfig.transformMountpoints) {
                        currentBlockConfig.transformMountpoints.forEach((mount) => {
                            console.log(`\t- ID: ${mount.bucketId}, Mount point: ${mount.mountPoint}`);
                        });
                    }
                    else {
                        console.log('None');
                    }
                break;

                case 'transferLearning':
                    if (currentBlockConfig.tlOperatesOn) {
                        console.log(`Operates on: ${currentBlockConfig.tlOperatesOn}`);
                    }

                    if (currentBlockConfig.tlObjectDetectionLastLayer) {
                        console.log(`Object detection type: ${currentBlockConfig.tlObjectDetectionLastLayer}`);
                    }
                break;

                case 'deploy':
                    if (currentBlockConfig.deployCategory) {
                        console.log(`Deployment category: ${currentBlockConfig.deployCategory}`);
                    }
                break;

                case 'dsp':
                    if (currentBlockConfig.port) {
                        console.log(`Port: ${currentBlockConfig.port}`);
                    }
                break;
            }
        }
        catch (ex) {
            let ex2 = <Error>ex;

            console.error('Error while printing block: ' + ex2.stack || ex2.toString());
            process.exit(1);
        }
    }
})();

async function checkConfigFile(host: string): Promise<boolean> {
    // Return true if a config file exists
    if (globalCurrentBlockConfig) {
        return true;
    }

    try {
        if (!await exists(configFilePath)) {
            return false;
        }
        let file = (await fs.promises.readFile('.ei-block-config')).toString('utf-8');

        let config = <BlockConfigV1>JSON.parse(file);

        // old format, no hostnames here?
        if (typeof config.version === 'undefined' && typeof (<any>config).name === 'string') {
            let c: BlockConfigV1 = {
                version: 1,
                config: { }
            };
            c.config[host] = <BlockConfigItem><unknown>config;
            config = c;
        }

        if (config.version !== 1) {
            throw new Error('Invalid version, expected "1" but received "' + config.version + '"');
        }

        // Store the config
        globalCurrentBlockConfig = config;

        return true;
    }
    catch (ex2) {
        let ex = <Error>ex2;
        console.error('Unable to load block: Config file is invalid. Try deleting the config file ' +
            'and re-running "edge-impulse-blocks init".');
        console.error(ex.message || ex.toString());
        process.exit(1);
    }
}

async function writeConfigFile() {
    await fs.promises.writeFile(configFilePath, JSON.stringify(globalCurrentBlockConfig, null, 4));
}

async function getWebsocket(organizationId: number, jobsApi: OrganizationJobsApi, apiEndpoint: string):
    Promise<WebSocket> {
    const tokenRes = await jobsApi.getOrganizationSocketToken(organizationId);
    const wsHost = apiEndpoint.replace('/v1', '').replace('http', 'ws');
    if (!tokenRes.body.success || !tokenRes.body.token) {
        throw new Error('Failed to acquire socket token: ' + (tokenRes.body.error || tokenRes.response));
    }

    let tokenData = {
        success: true,
        token: tokenRes.body.token
    };

    let ws = new WebSocket(wsHost + '/socket.io/?token=' +
        tokenData.token.socketToken + '&EIO=3&transport=websocket');

    return new Promise((resolve, reject) => {
        ws.onclose = () => {
            reject('websocket was closed');
        };
        ws.onerror = err => {
            reject('websocket error: ' + err);
        };
        ws.onmessage = msg => {
            try {
                let m = <MessageBlock>JSON.parse(msg.data.toString().replace(/^[0-9]+/, ''));
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

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function bytesToSize(bytes: number) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    let i = Number(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

export async function exists(path: string) {
    let x = false;
    try {
        await util.promisify(fs.stat)(path);
        x = true;
    }
    catch (ex) {
        /* noop */
    }
    return x;
}

/**
 * Spinner on the terminal
 * @returns Interval (just call clearInterval to stop the spinner)
 */
function spinner() {
    const spinChars = ['-', '\\', '|', '/'];
    let spinIx = -1;

    return setInterval(() => {
        spinIx++;
        spinIx = spinIx % (spinChars.length);

        process.stdout.write('\b' + (spinChars[spinIx]));
    }, 250);
}
