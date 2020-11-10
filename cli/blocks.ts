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
    UploadCustomBlockRequestTypeEnum
} from '../sdk/studio/api';
import request from 'request-promise';
import unzip from 'unzipper';
import tar from 'tar';
import crypto from 'crypto';
import WebSocket, { OPEN } from 'ws';

const version = (<{ version: string }>JSON.parse(fs.readFileSync(Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;

type BlockConfig = {
    name: string,
    description: string,
    type: UploadCustomBlockRequestTypeEnum,
    id?: number,
    organizationId: number
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
const pythonSourcePath = 'https://github.com/edgeimpulse/template-transformation-block-python/archive/main.zip';

program
    .description('Create and publish transformation blocks')
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
            let inqRes = await inquirer.prompt([{
                type: 'list',
                choices: (organizations.body.organizations || []).map(p => ({ name: p.name, value: p.id })),
                name: 'organization',
                message: 'In which organization do you want to create this block?',
                pageSize: 20
            }]);
            organizationId = Number(inqRes.organization);
        }
        let organization = organizations.body.organizations.filter(org => org.id === organizationId)[0];

        console.log(`Attaching block to organization '${organization.name}'`);

        // Select the type of block
        let blockType: UploadCustomBlockRequestTypeEnum;
        let inqRes2 = await inquirer.prompt([{
            type: 'list',
            choices: [
                {
                    name: 'Transformation block',
                    value: 'transform'
                }
            ],
            name: 'type',
            message: 'Choose a type of block',
            pageSize: 20
        }]);
        blockType = <UploadCustomBlockRequestTypeEnum>inqRes2.type;

        let blockId: number | undefined;
        let blockName: string | undefined;
        let blockDescription: string | undefined;
        // Update an existing block or create a new one?
        let blocks = await config.api.organizationBlocks.listOrganizationTransformationBlocks(organizationId);
        // If no blocks exist, force create
        let inqRes3 =
            (blocks.body && blocks.body.transformationBlocks && blocks.body.transformationBlocks.length > 0)
            ? (await inquirer.prompt([{
            type: 'list',
            choices: [
                {
                    name: 'Create a new block',
                    value: 'create'
                },
                {
                    name: 'Update an existing block',
                    value: 'update'
                }],
            name: 'option',
            message: 'Choose an option',
            pageSize: 20
        }])).option : 'create';
        if (inqRes3 === 'update' && blocks.body.transformationBlocks) {
            // Update an existing block
            // Choose a block ID
            let inqRes4 = await inquirer.prompt([{
                type: 'list',
                choices: blocks.body.transformationBlocks.map(p => ({ name: p.name, value: p.id })),
                name: 'id',
                message: 'Choose a block to update',
                pageSize: 20
            }]);
            blockId = Number(inqRes4.id);
            const selectedBlock = blocks.body.transformationBlocks.filter(block => block.id === blockId)[0];
            if (selectedBlock) {
                blockDescription = selectedBlock.description;
                blockName = selectedBlock.name;
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

        // Create & write the config
        currentBlockConfig = blockId ? {
            name: blockName,
            id: blockId,
            type: blockType,
            description: blockDescription,
            organizationId
        } : {
            name: blockName,
            type: blockType,
            description: blockDescription,
            organizationId
        };
        console.log('Creating block with config:', currentBlockConfig);
        await writeConfigFile();

        const hasDockerFile = (await fs.promises.readdir(process.cwd())).find(x => x === 'Dockerfile');

        if (inqRes3 === 'create' && !hasDockerFile) {
            // Fetch the example files
            let inqRes5 = await inquirer.prompt([{
                type: 'list',
                choices: ['yes', 'no'],
                name: 'option',
                message: 'Would you like to download and load the example repository (Python)?',
                pageSize: 20
            }]);
            if (inqRes5.option === 'yes') {
                try {
                    const directoryRoot = 'template-transformation-block-python-main/';
                    const data = await request(pythonSourcePath)
                        .pipe(unzip.Parse())
                        .on('entry', (entry: ExtractedFile) => {
                            // To unzip in the current directory:
                            // Ignore the encapsulating folder
                            if (entry.path === directoryRoot) {
                                // tslint:disable-next-line: no-unsafe-any
                                entry.autodrain();
                            } else {
                                const newFilename = entry.path.replace(directoryRoot, './');
                                // tslint:disable-next-line: no-unsafe-any
                                entry.pipe(fs.createWriteStream(newFilename));
                            }
                        })
                        .promise();
                    console.log('Template repository fetched!');
                }
                catch (e) {
                    console.warn('Unable to fetch the repository:', e);
                    console.log('You can fetch the template later from', pythonSourcePath);
                }
            } else {
                console.log('You can fetch the template later from', pythonSourcePath);
            }
        }
        console.log(`Your new block '${blockName}' has been created in '${process.cwd()}'.`);
        console.log('When you have finished building your transformation block, run "edge-impulse-blocks push" to ' +
            'update the block in Edge Impulse.');
        process.exit(0);
    }

    if (pushCommand) {
        // Tar & compress the repository and push to the endpoint
        // Check if a config file exists
        if (!await checkConfigFile() || !currentBlockConfig) {
            console.error('A config file cannot be found. Run "init" to create a new block.');
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
                const newBlockObject: AddOrganizationTransformationBlockRequest = {
                    name: currentBlockConfig.name,
                    description: currentBlockConfig.description,
                    dockerContainer: '',
                    indMetadata: true,
                    cliArguments: ''
                };
                const newResponse = await config.api.organizationBlocks.addOrganizationTransformationBlock(
                    organizationId, newBlockObject);
                if (!newResponse.body.success) {
                    console.error('Unable to add the block to your organization: ', newResponse.body.error);
                    process.exit(1);
                }

                currentBlockConfig.id = newResponse.body.id;
                await writeConfigFile();
            }

            // Tar & compress the file & push to the endpoint
            const packagePath = Path.join(os.tmpdir(), 'ei-transform-block-' +
                crypto.randomBytes(16).toString("hex") + '.tar.gz');

            // Create the new tarfile
            console.log(`Archiving '${cwd}'...`);
            // Check to see if there is an ignore file
            let patternsToIgnore: string[] = [];
            if (fs.existsSync('.ei-ignore')) {
                try {
                    const ignoreFile = fs.readFileSync('.ei-ignore', 'utf-8');
                    patternsToIgnore = ignoreFile.split('\n');
                }
                catch (e) {
                    console.warn('Unable to read .ei-ignore file');
                }
            }
            const compressCurrentDirectory = new Promise((resolve, reject) => {
                tar.c({ gzip: true, filter: (path) => {
                    const pathSplit = path.split('/');
                    const filename = pathSplit[pathSplit.length - 1];
                    for (const pattern of patternsToIgnore) {
                        // Filter out filename or path matches
                        if (pattern === filename || pattern === path) return false;
                        // If pattern ends in *, filter out anything beginning with pattern
                        if (pattern.endsWith('*') && path.startsWith(pattern.slice(0, pattern.length - 1))) {
                            return false;
                        }
                        // If pattern starts with *, filter out anything ending with pattern
                        if (pattern.startsWith('*') && path.endsWith(pattern.slice(1, pattern.length))) {
                            return false;
                        }
                    }
                    return true;
                } }, [ '.' ])
                    .pipe(fs.createWriteStream(packagePath))
                    .on('close', resolve);
            });
            await compressCurrentDirectory;

            // Check the size of the file
            const fileSize = fs.statSync(packagePath).size;
            if (fileSize > 400 * 1000 * 1000) {
                console.error('Your custom block exceeds the block size limit of 400MB. If your archive includes ' +
                    ' unwanted files, add a .ei-ignore file to list files that will be ignored when compressing your ' +
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
            const uploadResponse = await config.api.organizationCreateProject.uploadCustomTransformation(
                currentBlockConfig.organizationId,
                tarFile,
                currentBlockConfig.type,
                currentBlockConfig.id || 0
            );
            if (!uploadResponse.body.success || !uploadResponse.body.id) {
                console.error('Unable to upload your transformation block:', uploadResponse.body.error);
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
            console.log(`Building transformation block '${currentBlockConfig.name}'...`);
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

            console.log(`Building transformation block '${currentBlockConfig.name}' OK`);
            console.log('');

            const organizationStudioPath = config.endpoints.internal.api.replace('/v1', '') + '/organization/' +
                organizationId + '/data';

            console.log(`Your block has been updated, go to ${organizationStudioPath} to run a new transformation`);
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
