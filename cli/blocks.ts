#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import Path from 'path';
import os from 'os';
import { Config, EdgeImpulseConfig } from './config';
import checkNewVersions from './check-new-version';
import inquirer from 'inquirer';
import {
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

const version = (<{ version: string }>JSON.parse(fs.readFileSync(Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;

type BlockConfig = {
    name: string,
    description: string,
    type: UploadCustomBlockRequestTypeEnum,
    id?: number,
    organizationId: number,
    operatesOn: 'file' | 'dataitem' | 'standalone' | undefined
};

interface ExtractedFile {
    path: string;
    autodrain: any;
    pipe: any;
}

interface RequestDetailedFile {
    value: Buffer;
    options?: {
        filename?: string;
        contentType?: string;
    };
}

type MessageBlock = [
    string,
    {
        data?: string,
        success?: boolean,
        hello?: { version: number }
    }
];

const packageVersion = (<{ version: string }>JSON.parse(fs.readFileSync(
    Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;
const configFilePath = '.ei-block-config';

program
    .description('Create and publish custom transformation & deployment blocks')
    .version(packageVersion)
    .option('init', 'Initialize the current folder as a new block')
    .option('push', 'Push the current block to Edge Impulse')
    .option('-c --clean', 'Reset the current user')
    .option('-d --dev', 'Developer mode')
    .option('--api-key <key>', 'API key')
    .allowUnknownOption(false)
    .parse(process.argv);

const initCommand: boolean = !!program.init;
const pushCommand: boolean = !!program.push;
const cleanArgv: boolean = !!program.clean;
const devArgv: boolean = !!program.dev;
const apiKeyArgv: string | undefined = program.apiKey ? <string>program.apiKey : undefined;

let currentBlockConfig: BlockConfig | undefined;

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
        catch (ex) {
            if (apiKeyArgv) {
                throw ex;
            }
            console.log('Stored token seems invalid, clearing cache...', ex);
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

    if (!initCommand && !pushCommand) {
        console.log('Specify a command:');
        console.log('   init: Initialize the current folder as a new block');
        console.log('   push: Push the current folder to the server');
        return;
    }

    if (!config) return;

    if (initCommand) {
        // Initialize the current folder as a new block

        // Check if a config file already exists
        if (await checkConfigFile()) {
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

        // Fetch all relevant existing blocks so the user can select an existing block to update
        let existingBlocks: {
            name: string, value: number, block: {
                description: string, name: string, operatesOn: 'file' | 'dataitem' | 'standalone' | undefined }
            }[] = [];
        if (blockTypeInqRes.type === 'transform') {
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
        } else if (blockTypeInqRes.type === 'deploy') {
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
        } else {
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

        // Enter block name
        if (!blockName || blockName.length < 2) {
            blockName = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'name',
                message: 'Enter the name of your block',
                default: "My new block"
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
                message: 'Enter the description of your block'
            }])).description;
            if (blockDescription === '') blockDescription = blockName;
        }


        if (createOrUpdateInqRes === 'create' && blockTypeInqRes.type === 'transform') {
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
        }

        // Create & write the config
        currentBlockConfig = blockId ? {
            name: blockName,
            id: blockId,
            type: blockType,
            description: blockDescription,
            organizationId,
            operatesOn: blockOperatesOn,
        } : {
            name: blockName,
            type: blockType,
            description: blockDescription,
            organizationId,
            operatesOn: blockOperatesOn,
        };
        console.log('Creating block with config:', currentBlockConfig);
        await writeConfigFile();

        const hasDockerFile = (await fs.promises.readdir(process.cwd())).find(x => x === 'Dockerfile');

        if (createOrUpdateInqRes === 'create' && !hasDockerFile) {
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
            } else if (blockType === 'deploy') {
                templateSourcePath = 'https://github.com/edgeimpulse/template-deployment-block/archive/main.zip';
                directoryRoot = 'template-deployment-block-main/';
            } else {
                console.error(`Invalid block type: ${blockType}`);
                process.exit(1);
            }

            if (fetchInqRes.option === 'yes') {
                try {
                    const data = await request(templateSourcePath)
                        .pipe(unzip.Parse())
                        .on('entry', (entry: ExtractedFile) => {
                            // To unzip in the current directory:
                            const newFilename = entry.path.replace(directoryRoot, './');
                            let subdirectories = entry.path.split('/');
                            // Ignore folders
                            if (subdirectories[subdirectories.length - 1] === '') {
                                // tslint:disable-next-line: no-unsafe-any
                                entry.autodrain();
                            } else {
                                // Remove the root and filename and create any subdirectories
                                if (subdirectories.length > 2) {
                                    subdirectories = subdirectories.slice(1, subdirectories.length - 1);
                                    const newDirectory = subdirectories.join('/');
                                    fs.mkdirSync(newDirectory, { recursive: true });
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
        if (!await checkConfigFile() || !currentBlockConfig) {
            console.error('A config file cannot be found. Run "init" to create a new block.');
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
                        additionalMountPoints: []
                    };
                    newResponse = await config.api.organizationBlocks.addOrganizationTransformationBlock(
                        organizationId, newBlockObject);
                } else if (currentBlockConfig.type === 'deploy') {
                    newResponse = await config.api.organizationBlocks.addOrganizationDeployBlock(
                        organizationId, currentBlockConfig.name, '', currentBlockConfig.description, '');
                } else {
                    console.error(`Unable to upload your block - unknown block type: ${currentBlockConfig.type}`);
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
            if (fs.existsSync('.dockerignore')) {
                try {
                    const ignoreFile = fs.readFileSync('.dockerignore', 'utf-8');
                    ignore.add(ignoreFile.split('\n').map(x => x.trim()));
                }
                catch (ex) {
                    console.warn('Unable to read .dockerignore file', ex);
                }
            }
            const compressCurrentDirectory = new Promise((resolve, reject) => {
                tar.c({ gzip: true, filter: (path) => {
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
            const fileSize = fs.statSync(packagePath).size;
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
                    // console.log('socket.onmessage', msg);
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
            } else if (currentBlockConfig.type === 'deploy') {
                const organizationStudioPath = config.endpoints.internal.api.replace('/v1', '') + '/organization/' +
                organizationId + '/deployment';
                console.log(`Your block has been updated and is now available on the Deployment page ` +
                    `for every project under ${organizationName}.`);
                console.log(`You can set the block image or update details at ` +
                    organizationStudioPath);
            }
            process.exit(0);
        }
        catch (e) {
            console.error('Failed to package block:', e);
            process.exit(1);
        }
    }
})();

async function checkConfigFile(): Promise<boolean> {
    // Return true if a config file exists
    if (currentBlockConfig) return true;
    try {
        if (!fs.existsSync(configFilePath)) {
            return false;
        }
        let file = fs.readFileSync('.ei-block-config', 'utf-8');
        // Store the config
        currentBlockConfig = <BlockConfig>JSON.parse(file);
        return true;
    }
    catch (e) {
        console.error('Unable to edit block: Config file is invalid. Try deleting the config file and running "init".');
        process.exit(1);
    }
}

async function writeConfigFile() {
    fs.writeFileSync(configFilePath, JSON.stringify(currentBlockConfig));
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
