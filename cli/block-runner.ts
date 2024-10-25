import fs from "fs";
import Path from "path";
import os from "os";
import tar from "tar";
import yauzl, { Entry } from "yauzl";
import { spawn, SpawnOptions } from "child_process";
import { Config, EdgeImpulseConfig } from "./config";
import inquirer from "inquirer";
import { split as argvSplit } from './argv-split';
import http from 'http';
import {
    ListOrganizationDataResponseAllOfData, OrganizationDataItemFiles,
    OrganizationTransformationBlock, UpdateProjectRequest,
    UploadCustomBlockRequestTypeEnum
} from "../sdk/studio";
import * as models from '../sdk/studio/sdk/model/models';
import { pathExists } from "./blocks/blocks-helper";
import { BlockConfig } from "./blocks/block-config-manager";
import { CLIBlockType } from "../shared/parameters-json-types";

const CON_PREFIX = '\x1b[34m[BLK]\x1b[0m';

export type DockerBuildParams = {
    blockConfig: BlockConfig;
    containerName: string;
};

type DockerRunParams = {
    blockConfig: BlockConfig;
    type: UploadCustomBlockRequestTypeEnum;
    containerName: string | undefined;
} & (
    (
        {
            type: "transform";
            operatesOn: "file" | "directory" | "standalone" | undefined;
            metadata?: string;
            hmacKey?: string;
        } & (
            {
                operatesOn: "standalone";
            } | {
                operatesOn: "directory";
                // path to directory of dataItem -> $PWD/datafolder/prefix/dataset/dataItem
                inDir: string;
            } | {
                operatesOn: "file";
                // path to file from PWD/data/
                inFileDir: string;
                filename: string;
            }
        )
    ) | (
        {
            type: "transferLearning";
            epochs: number;
            learningRate: number;
            validationSetSize: number;
            inputShape: string;
        } | {
            type: "deploy";
        } | {
            type: "dsp";
            port: number;
        }
    )
);

export type RunnerOptions = {
    container?: string;
    type: CLIBlockType;
    extraArgs?: string;
} & (
    {
        type: "transform";
        dataset?: string;
        dataPath?: string;
        dataItem?: string;
        file?: string;
        skipDownload?: boolean;
    } | {
        type: "machine-learning";
        epochs?: string;
        learningRate?: string;
        validationSetSize?: string;
        inputShape?: string;
        downloadData?: string | boolean;
    } | {
        type: "dsp";
        port?: string;
    } | {
        type: "deploy";
        downloadData?: string | boolean;
    } | {
        type: "synthetic-data";
    } | {
        type: "ai-action";
    }
);

export interface IRunner {
    setup: () => Promise<void>;
    getDockerBuildCommand: () => Promise<{ command: string; args: string[] }>;
    getDockerRunCommand: () => Promise<{ command: string; args: string[] }>;
    run: () => Promise<void>;
}

async function fileExists(filePath: string): Promise<boolean> {
    return !!(await fs.promises.stat(filePath).catch((e) => false));
}

export abstract class BlockRunner implements IRunner {
    protected _cliConfig: Config;
    protected _eiConfig: EdgeImpulseConfig;
    protected _blockConfig: BlockConfig;
    protected _runnerOpts: RunnerOptions;
    protected _dockerBuildParams: DockerBuildParams | undefined;
    protected _dockerRunParams: DockerRunParams | undefined;

    constructor(
        cliConfig: Config,
        eiConfig: EdgeImpulseConfig,
        blockConfig: BlockConfig,
        runnerOpts: RunnerOptions
    ) {
        this._cliConfig = cliConfig;
        this._eiConfig = eiConfig;
        this._blockConfig = blockConfig;
        this._runnerOpts = runnerOpts;
    }

    /**
     * @summary Configure the runner, such as the container name and other params.
     * Call this before other methods and in concrete child classes
     */
    async setup(): Promise<void> {
        if (!this._runnerOpts.container) {
            let containerInq = <{ name: string }>await inquirer.prompt([
                {
                    type: "input",
                    name: "name",
                    message: "Provide a name for the Docker container: "
                }
            ]);

            this._dockerBuildParams = {
                blockConfig: this._blockConfig,
                containerName: containerInq.name
            };

            return;
        }

        this._dockerBuildParams = {
            blockConfig: this._blockConfig,
            containerName: this._runnerOpts.container
        };
    }

    async getDockerBuildCommand(): Promise<{
        command: string;
        args: string[];
    }> {
        if (
            !this._dockerBuildParams ||
            !this._dockerBuildParams.containerName
        ) {
            throw new Error("No name for Docker container");
        }

        return {
            command: "docker",
            args: [ "build", "-t", this._dockerBuildParams.containerName, "." ]
        };
    }

    abstract getDockerRunCommand(): Promise<{
        command: string;
        args: string[];
    }>;

    async run(): Promise<void> {
        let buildCmd = await this.getDockerBuildCommand();
        let runCmd = await this.getDockerRunCommand();

        try {
            console.log(CON_PREFIX, 'Building container:', buildCmd.command, buildCmd.args.join(' '));
            await this.runAndWaitForCompletion(buildCmd, true);
            console.log(CON_PREFIX, 'Building container OK');
            console.log('');

            console.log(CON_PREFIX, 'Running container:', runCmd.command, runCmd.args.join(' '));
            await this.runAndWaitForCompletion(runCmd, true);
            console.log(CON_PREFIX, 'Running container OK');
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.error(CON_PREFIX,
                "Failed to run command:",
                ex.message || ex.toString()
            );
            process.exit(1);
        }
    }

    async runAndWaitForCompletion(opts: {
        command: string;
        args: string[];
    }, forwardStdio: boolean) {
        return new Promise<void>((resolve, reject) => {
            let spawnOpts: SpawnOptions = { };
            if (forwardStdio) {
                spawnOpts.stdio = 'inherit';
            }

            const p = spawn(opts.command, opts.args, spawnOpts);

            if (!forwardStdio) {
                if (p.stdout && p.stderr) {
                    p.stdout.on("data", (data: Buffer) => {
                        process.stdout.write(data);
                    });

                    p.stderr.on("data", (data: Buffer) => {
                        process.stderr.write(data);
                    });
                }
            }

            p.on("error", (err) => {
                process.stderr.write(err.toString());
            });

            p.on("exit", (code, signal) => {
                if (typeof code === "number" && code !== 0) {
                    reject("Command exited with code " + code);
                }
                else if (signal) {
                    reject("Terminated with signal " + signal);
                }
                else {
                    resolve();
                }
            });
        });
    }

    async runAndWaitForNgrok(opts: {
        command: string;
        args: string[];
    }, forwardStdio: boolean) {
        return new Promise<void>((resolve, reject) => {
            let spawnOpts: SpawnOptions = { };
            if (forwardStdio) {
                spawnOpts.stdio = 'inherit';
            }

            const p = spawn(opts.command, opts.args, spawnOpts);

            if (!forwardStdio) {
                if (p.stdout && p.stderr) {
                    p.stdout.on("data", (data: Buffer) => {
                        process.stdout.write(data);
                    });

                    p.stderr.on("data", (data: Buffer) => {
                        process.stderr.write(data);
                    });
                }
            }

            p.on("error", (err) => {
                process.stderr.write(err.toString());
            });

            p.on("exit", (code, signal) => {
                if (typeof code === "number" && code !== 0) {
                    reject("Command exited with code " + code);
                }
                else if (signal) {
                    reject("Terminated with signal " + signal);
                }
                else {
                    resolve();
                }
            });
        });
    }
}

export class BlockRunnerFactory {
    static async getRunner(
        type: CLIBlockType,
        cliConfig: Config,
        eiConfig: EdgeImpulseConfig,
        blockConfig: BlockConfig,
        runnerOpts: RunnerOptions
    ): Promise<BlockRunner> {
        let runner: BlockRunner;

        switch (type) {
            case "transform":
                runner = new BlockRunnerTransform(
                    cliConfig,
                    eiConfig,
                    blockConfig,
                    runnerOpts
                );
                break;

            case "deploy":
                runner = new BlockRunnerDeploy(
                    cliConfig,
                    eiConfig,
                    blockConfig,
                    runnerOpts
                );
                break;

            case "dsp":
                runner = new BlockRunnerDSP(
                    cliConfig,
                    eiConfig,
                    blockConfig,
                    runnerOpts
                );
                break;

            case "machine-learning":
                runner = new BlockRunnerTransferLearning(
                    cliConfig,
                    eiConfig,
                    blockConfig,
                    runnerOpts
                );
                break;

            case "synthetic-data":
                throw new Error('Synthetic data blocks are not supported in "edge-impulse-blocks runner"');

            default:
                throw new Error("Invalid BlockRunner type");
        }

        await runner.setup();

        return runner;
    }
}

export class BlockRunnerTransform extends BlockRunner {
    private _dataItem: ListOrganizationDataResponseAllOfData | undefined;

    async setup(): Promise<void> {
        await super.setup();

        if (
            this._blockConfig.type !== "transform" ||
            this._runnerOpts.type !== "transform"
        ) {
            throw new Error(
                `Incompatible block type ${this._blockConfig.type}`
            );
        }

        if (!this._blockConfig.config) {
            throw new Error('Block config is null');
        }

        let operatesOn = this._blockConfig.parameters.info.operatesOn;

        if (!operatesOn) {
            let transformBlocksRes = (
                await this._eiConfig.api.organizationBlocks.listOrganizationTransformationBlocks(
                    this._blockConfig.config.organizationId
                )
            );

            if (!this._blockConfig.config.id) {
                throw new Error(
                    "Local block has no ID. Try running `edge-impulse-blocks push` first"
                );
            }

            let foundBlock = transformBlocksRes.transformationBlocks.find(
                (el: OrganizationTransformationBlock) =>
                    el.id === this._blockConfig.config!.id
            );

            if (!foundBlock) {
                throw new Error(
                    `Unable to retrieve block with id=${this._blockConfig.config.id} from the server`
                );
            }

            operatesOn = foundBlock.operatesOn;
        }

        if (operatesOn === "standalone") {
            // just run the container
            this._dockerRunParams = {
                blockConfig: this._blockConfig,
                containerName: this._dockerBuildParams?.containerName,
                type: "transform",
                operatesOn: "standalone",
            };
        }
        else {

            if (this._runnerOpts.dataItem && this._runnerOpts.dataPath) {
                throw new Error('Either a data item or data path should be specified, not both');
            }

            // We can look up data to transform by either data item name (clinical data only),
            // or path within a dataset (all data).
            // We first need to check which option the user has specified, and if they haven't specified
            // an option yet, get them to choose and get any missing values.
            let lookupOpts: {
                method: 'dataitem';
                dataItemName: string;
            } | {
                method: 'path';
                path: string;
                dataset: string;
            } | undefined;

            if (this._runnerOpts.dataItem) {
                lookupOpts = {
                    method: 'dataitem',
                    dataItemName: this._runnerOpts.dataItem,
                };
            }
            else if (this._runnerOpts.dataPath) {
                // We need the dataset name for this option
                let dataset = this._runnerOpts.dataset;
                if (!dataset) {
                    const datasetInqRes = <{ dataset: string }>await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'dataset',
                            message: 'What is the name of the dataset you would like to use?',
                        }
                    ]);
                    dataset = datasetInqRes.dataset;
                }

                lookupOpts = {
                    method: 'path',
                    path: this._runnerOpts.dataPath,
                    dataset: dataset,
                };
            }
            else {
                // Neither path nor a data item has been specified yet.
                // Ask the user which they would like to specify, and then get a value for this choice.
                const dataPathMethodInq = <{ dataPathMethod: string }>await inquirer.prompt([{
                    type: 'list',
                    message: 'How should we look up the data to run this transform block against?',
                    choices: [
                        {
                            name: 'By data item name (clinical data only)',
                            value: 'dataitem',
                        },
                        {
                            name: 'By path (clinical or default data)',
                            value: 'path',
                        },
                    ],
                    name: 'dataPathMethod'
                }]);

                if (dataPathMethodInq.dataPathMethod === 'dataitem') {
                    // Lookup by data item
                    const dataItemInq = <{ dataItemName: string }>await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'dataItemName',
                            message: 'What is the name of the data item you would like to use?',
                        }
                    ]);

                    lookupOpts = {
                        method: 'dataitem',
                        dataItemName: dataItemInq.dataItemName,
                    };
                }
                else {
                    // First we need the dataset name
                    let dataset = this._runnerOpts.dataset;
                    if (!dataset) {
                        const datasetInqRes = <{ dataset: string }>await inquirer.prompt([
                            {
                                type: 'input',
                                name: 'dataset',
                                message: 'What is the name of the dataset you would like to use?',
                            }
                        ]);
                        dataset = datasetInqRes.dataset;
                    }

                    // Lookup by path
                    const pathInq = <{ path: string }>await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'path',
                            message: 'Give the path to the data you would like to transform, relative to the root ' +
                                `path of the parent dataset ("${dataset}")`,
                        }
                    ]);

                    lookupOpts = {
                        method: 'path',
                        path: pathInq.path,
                        dataset: dataset,
                    };
                }
            }

            if (lookupOpts.method === 'dataitem') {
                this._dataItem = await this.getDataItemByName(
                    this._runnerOpts.dataset,
                    lookupOpts.dataItemName,
                    this._blockConfig.config.organizationId,
                    this._eiConfig
                );
                if (operatesOn === "directory") {
                    const downloadDir = Path.join(
                        process.cwd(),
                        'ei-block-data',
                    );

                    await this.downloadAndExtractFiles(downloadDir, {
                        type: 'dataitem',
                        bucketPath: this._dataItem.bucketPath,
                        totalFileSize: this._dataItem.totalFileSize,
                        id: this._dataItem.id,
                        name: this._dataItem.name,
                    });

                    this._dockerRunParams = {
                        blockConfig: this._blockConfig,
                        containerName: this._dockerBuildParams?.containerName,
                        type: "transform",
                        operatesOn: "directory",
                        metadata: this._dataItem ? JSON.stringify(this._dataItem.metadata) : undefined,
                        hmacKey: "0",
                        inDir: Path.join(downloadDir, this._dataItem.bucketPath)
                    };
                }
                else if (operatesOn === "file") {
                    const downloadDir = Path.join(
                        process.cwd(),
                        'ei-block-data',
                        this._dataItem.dataset.toLowerCase().replace(/\s/g, '-').replace(/[\.]/g, ''),
                        this._dataItem.name
                    );

                    const file = await this.downloadFileFromDataItem(downloadDir);

                    this._dockerRunParams = {
                        blockConfig: this._blockConfig,
                        containerName: this._dockerBuildParams?.containerName,
                        type: 'transform',
                        operatesOn: 'file',
                        metadata: JSON.stringify(this._dataItem.metadata),
                        hmacKey: '0',
                        inFileDir: file.fileDir,
                        filename: file.filename
                    };
                }
            }
            else {
                if (operatesOn === 'directory') {
                    const downloadDir = Path.join(
                        process.cwd(),
                        'ei-block-data',
                    );

                    // Check the dataset exists and get the bucket path
                    const datasetInfo = await this._eiConfig.api.organizationData.getOrganizationDataset(
                        this._blockConfig.config.organizationId,
                        lookupOpts.dataset,
                    );
                    if (!datasetInfo.success) {
                        throw new Error('Unable to get dataset: ' + datasetInfo.error);
                    }
                    const datasetBucketPath = datasetInfo.dataset.bucketPath;
                    if (!datasetBucketPath) {
                        throw new Error('Dataset has no bucket path set');
                    }

                    await this.downloadAndExtractFiles(downloadDir, {
                        type: 'path',
                        bucketPath: datasetBucketPath,
                        dataset: lookupOpts.dataset,
                        dirPath: lookupOpts.path,
                    });

                    this._dockerRunParams = {
                        blockConfig: this._blockConfig,
                        containerName: this._dockerBuildParams?.containerName,
                        type: 'transform',
                        operatesOn: 'directory',
                        metadata: this._dataItem ? JSON.stringify(this._dataItem.metadata) : undefined,
                        hmacKey: '0',
                        inDir: Path.join(downloadDir, datasetBucketPath)
                    };
                }
                else if (operatesOn === 'file') {
                    // Trim the filename from the given path
                    const pathInDataset = lookupOpts.path.substring(0,
                        lookupOpts.path.lastIndexOf(Path.basename(lookupOpts.path)));

                    const downloadDir = Path.join(
                        process.cwd(),
                        'ei-block-data',
                        lookupOpts.dataset.toLowerCase().replace(/\s/g, '-').replace(/[\.]/g, ''),
                        pathInDataset,
                    );

                    const file = await this.downloadFileByPath(lookupOpts.path, lookupOpts.dataset, downloadDir);

                    this._dockerRunParams = {
                        blockConfig: this._blockConfig,
                        containerName: this._dockerBuildParams?.containerName,
                        type: "transform",
                        operatesOn: "file",
                        metadata: undefined,
                        hmacKey: "0",
                        inFileDir: file.fileDir,
                        filename: file.filename
                    };
                }
            }
        }
    }

    async getDockerRunCommand(): Promise<{ command: string; args: string[] }> {
        if (!this._dockerRunParams) throw new Error("Unable to build command");

        let ret: { command: string; args: string[] } = {
            command: "docker",
            args: [ "run" ]
        };

        if (this._dockerRunParams.type !== "transform") {
            throw new Error(
                `Invalid type (expected "transform", but received "${this._dockerRunParams.type}")`
            );
        }
        if (!this._blockConfig.config) {
            throw new Error('Block config is null');
        }

        let env = [
            `EI_ORGANIZATION_ID=${this._blockConfig.config.organizationId.toString()}`,
        ];
        for (let k of Object.keys(process.env)) {
            if (k.startsWith('EI_')) {
                env.push(`${k}=${process.env[k]}`);
            }
        }
        for (let e of env) {
            ret.args.push('-e');
            ret.args.push(e);
        }

        if (this._dockerRunParams.operatesOn === "directory") {
            ret.args = ret.args.concat([
                "--rm",
                "-v",
                `${this._dockerRunParams.inDir}:/data`,
                this._dockerRunParams.containerName || "",
                "--in-directory",
                "/data",
                "--out-directory",
                "/data/out"
            ]);
        }
        else if (this._dockerRunParams.operatesOn === "file") {
            ret.args = ret.args.concat([
                "--rm",
                "-v",
                `${this._dockerRunParams.inFileDir}:/data`,
                this._dockerRunParams.containerName || "",
                "--in-file",
                `/data/${this._dockerRunParams.filename}`,
                "--out-directory",
                "/data/out"
            ]);
        }
        else if (this._dockerRunParams.operatesOn === "standalone") {
            ret.args = ret.args.concat([
                "--rm",
                this._dockerRunParams.containerName || ""
            ]);
        }

        if (this._dockerRunParams.metadata) {
            ret.args.push("--metadata");
            ret.args.push(this._dockerRunParams.metadata);
        }

        if (this._dockerRunParams.hmacKey) {
            ret.args.push("--hmac-key");
            ret.args.push(this._dockerRunParams.hmacKey);
        }

        if (this._runnerOpts.extraArgs) {
            ret.args = ret.args.concat(argvSplit(this._runnerOpts.extraArgs));
        }

        return ret;
    }

    async run(): Promise<void> {
        let buildCmd = await this.getDockerBuildCommand();
        let runCmd = await this.getDockerRunCommand();

        try {
            console.log(CON_PREFIX, 'Building container:', buildCmd.command, buildCmd.args.join(' '));
            await this.runAndWaitForCompletion(buildCmd, true);
            console.log(CON_PREFIX, 'Building container OK');
            console.log('');

            console.log(CON_PREFIX, 'Running container:', runCmd.command, runCmd.args.join(' '));
            await this.runAndWaitForCompletion(runCmd, true);
            console.log(CON_PREFIX, 'Running container OK');

            if (this._dockerRunParams?.type === 'transform') {
                if (this._dockerRunParams.operatesOn === 'file') {
                    console.log('');
                    console.log(CON_PREFIX, 'Source file downloaded to:',
                        Path.relative(process.cwd(),
                            Path.join(this._dockerRunParams.inFileDir, this._dockerRunParams.filename)));
                    console.log(CON_PREFIX, 'Block output is in:       ',
                        Path.relative(process.cwd(), Path.join(this._dockerRunParams.inFileDir, 'out')));
                }
                else if (this._dockerRunParams.operatesOn === 'directory') {
                    console.log('');
                    console.log(CON_PREFIX, 'Data downloaded to:',
                        Path.relative(process.cwd(), this._dockerRunParams.inDir));
                    console.log(CON_PREFIX, 'Block output is in:',
                        Path.relative(process.cwd(), Path.join(this._dockerRunParams.inDir, 'out')));
                }
            }
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.error(CON_PREFIX,
                "Failed to run command:",
                ex.message || ex.toString()
            );
            process.exit(1);
        }
    }

    /**
     * Download and extract all files from a data item or path within a dataset
     * @param path Output directory; files will be saved to here
     * @param sourceData Source data
     */
    private async downloadAndExtractFiles(
        path: string,
        sourceData: {
            type: 'dataitem'
            bucketPath: string,
            totalFileSize: number,
            id: number,
            name: string,
        } | {
            type: 'path',
            bucketPath: string,
            dataset: string,
            dirPath: string,
        }
    ) {
        if (this._runnerOpts.type === 'transform' && this._runnerOpts.skipDownload) return;
        if (!this._blockConfig.config) {
            throw new Error('Block config is null');
        }

        let currentFolderSize = 0;
        const extractFolder = Path.join(path, sourceData.bucketPath);

        await fs.promises.mkdir(extractFolder, { recursive: true });

        if (await fileExists(extractFolder)) {
            const files = await fs.promises.readdir(extractFolder);

            for (const filename of files) {
                const fileInfo = await fs.promises.stat(Path.join(extractFolder, filename));

                if (fileInfo.isFile()) {
                    currentFolderSize += fileInfo.size;
                }
            }
        }

        if (sourceData.type === 'dataitem' && sourceData.totalFileSize === currentFolderSize) {
            console.log(CON_PREFIX, 'Files already present, skipping download');
            return;
        }

        console.log(CON_PREFIX, `Downloading and extracting files to ${Path.relative(process.cwd(), path)}...`);
        let targetFilePath: string;

        // download raw Buffer (a tarball)
        if (sourceData.type === 'dataitem') {
            const fileRes = await this._eiConfig.api.organizationData.downloadOrganizationSingleDataItem(
                this._blockConfig.config.organizationId,
                sourceData.id,
                { },
            );

            targetFilePath = Path.join(
                path,
                `data-item-${sourceData.name}.tar`
            );

            const rawBuffer = fileRes;
            await fs.promises.writeFile(targetFilePath, rawBuffer);
        }
        else {
            const fileRes = await this._eiConfig.api.organizationData.downloadDatasetFolder(
                this._blockConfig.config.organizationId,
                sourceData.dataset,
                { path: sourceData.dirPath },
            );

            targetFilePath = Path.join(
                path,
                `data-item-${sourceData.dirPath.split('/').join('-')}.tar`
            );

            const rawBuffer = fileRes;
            await fs.promises.writeFile(targetFilePath, rawBuffer);
        }

        // extract and save files
        // path to files is BUCKET_PATH (<PREFIX>/<DATASET>/<DIRECTORY_IN_DATASET>/*)

        await tar.extract({
            file: targetFilePath,
            cwd: path
        });

        // delete tarball
        await fs.promises.unlink(targetFilePath);

        // Create the block output directory if it does not already exist
        const blockOutputDirectoryPath = Path.join(path, sourceData.bucketPath, 'out');
        if (!await fileExists(blockOutputDirectoryPath)) {
            await fs.promises.mkdir(blockOutputDirectoryPath);
        }

        console.log(CON_PREFIX, 'Done extracting files');
    }

    /**
     * Download a file from a data item (clinical data only)
     * @param fileDir Output directory; file will be saved to here
     */
    private async downloadFileFromDataItem(fileDir: string): Promise<{ fileDir: string, filename: string }> {
        if (!this._dataItem) throw new Error("No data item specified");

        if (this._runnerOpts.type !== 'transform') {
            throw new Error(`Incompatible block type: ${this._runnerOpts.type}`);
        }
        if (!this._blockConfig.config) {
            throw new Error('Block config is null');
        }

        let filename = this._runnerOpts.file ? this._runnerOpts.file : "";

        if (this._runnerOpts.type === 'transform' && this._runnerOpts.skipDownload) {
            return { fileDir: fileDir, filename: filename };
        }

        await fs.promises.mkdir(fileDir, { recursive: true });

        // grab list of files in data item
        let fileListRes = (
            await this._eiConfig.api.organizationData.getOrganizationDataItem(
                this._blockConfig.config.organizationId,
                this._dataItem.id,
                { }
            )
        );
        if (!fileListRes.success || fileListRes.data === undefined) {
            throw new Error(
                "Unable to retrieve list of files " + fileListRes.error
            );
        }

        if (!this._runnerOpts.file) {
            console.log(
                "Found files: ",
                fileListRes.data.files.map((f) => f.name)
            );

            let fileInq = <{ filename: string }>await inquirer.prompt([
                {
                    type: "input",
                    name: "filename",
                    message: "Enter the filename to process: "
                }
            ]);

            filename = fileInq.filename;
        }

        let filePath = Path.join(fileDir, filename);

        let foundFileEntry = fileListRes.data.files.find(
            (item: OrganizationDataItemFiles) => item.name === filename
        );

        if (!foundFileEntry) {
            throw new Error(`Unable to locate file ${filename} in bucket`);
        }

        // see if file is present and the same size
        // if it is, don't download
        if (await fileExists(filePath)) {
            let localFileSize = (await fs.promises.stat(filePath)).size;

            if (localFileSize === foundFileEntry.size) {
                console.log(CON_PREFIX, "File already present; skipping download...");
                return { fileDir: fileDir, filename: filename };
            }

            // delete the old file
            await fs.promises.unlink(filePath);
        }

        console.log(CON_PREFIX, `Downloading file ${filename} to ${fileDir}...`);

        // download file
        let file = (
            await this._eiConfig.api.organizationData.downloadOrganizationDataFile(
                this._blockConfig.config.organizationId,
                this._dataItem.id,
                {
                    fileName: filename
                }
            )
        );

        await fs.promises.writeFile(filePath, file);

        console.log(CON_PREFIX, `File downloaded`);

        return { fileDir: fileDir, filename: filename };
    }

    /**
     * Download a file from an org dataset by path (clinical or default data)
     * @param sourcePath Source data path, relatively to the root path of the given dataset
     * @param sourceDataset Source data dataset
     * @param targetDir Output directory; file will be saved to here
     */
    private async downloadFileByPath(
        sourcePath: string,
        sourceDataset: string,
        targetDir: string,
    ): Promise<{ fileDir: string, filename: string }> {
        if (this._runnerOpts.type !== 'transform') {
            throw new Error(`Incompatible block type: ${this._runnerOpts.type}`);
        }
        if (!this._blockConfig.config) {
            throw new Error('Block config is null');
        }

        const filename = Path.basename(sourcePath);

        if (this._runnerOpts.type === 'transform' && this._runnerOpts.skipDownload) {
            return { fileDir: targetDir, filename: filename };
        }

        await fs.promises.mkdir(targetDir, { recursive: true });

        const filePath = Path.join(targetDir, filename);

        // See if file already exists; if it does, do not download
        if (await fileExists(filePath)) {
            console.log(CON_PREFIX, 'File already present; skipping download...');
            return { fileDir: targetDir, filename: filename };
        }

        console.log(CON_PREFIX, `Downloading file ${filename} to ${targetDir}...`);

        // Get a download link for the file
        const datasetFilePathRes = await this._eiConfig.api.organizationData.downloadDatasetFile(
            this._blockConfig.config.organizationId,
            sourceDataset,
            { path: sourcePath },
        );
        if (!datasetFilePathRes.success) {
            throw new Error('Unable to fetch file: ' + datasetFilePathRes.error);
        }

        // Download the file
        const writeStream = fs.createWriteStream(filePath);
        await new Promise<void>((res) => {
            http.get(datasetFilePathRes.url, (response) => {
                response.pipe(writeStream);
                writeStream.on('finish', () => {
                    res();
                });
            });
        });

        console.log(CON_PREFIX, 'File downloaded successfully');

        return { fileDir: targetDir, filename: filename };
    }

    private async getDataItemByName(
        dataset: string | undefined,
        dataItemName: string,
        organizationId: number,
        config: EdgeImpulseConfig
    ): Promise<ListOrganizationDataResponseAllOfData> {

        const queryFilter = dataset ?
            `dataset='${dataset}' and name='${dataItemName}'` :
            `name='${dataItemName}'`;

        let res = (
            await config.api.organizationData.listOrganizationData(organizationId, {
                dataset: undefined,
                filter: queryFilter,
                limit: 1,
                offset: 0
            })
        );

        if (!res.success) {
            throw new Error("Unable to retrieve data item: " + res.error);
        }

        if (typeof res.totalDataItemCount === 'number' && res.totalDataItemCount > 1) {
            throw new Error(`Found multiple data items with name "${dataItemName}", specify --dataset as well`);
        }

        if (res.totalDataItemCount === 1 && res.data?.length === 1) {
            return res.data[0];
        }

        throw new Error(
            `Unable to find data item with the name "${dataItemName}"`
        );
    }
}

export class BlockRunnerTransferLearning extends BlockRunner {
    private _projectId: number = -1;

    async setup(): Promise<void> {
        if (this._runnerOpts.type !== 'machine-learning') {
            throw new Error(
                `Block type ${this._runnerOpts.type} is not "machine-learning"`
            );
        }

        await super.setup();

        let runner = await this._cliConfig.getRunner();

        let projectList = (await this._eiConfig.api.projects.listProjects());

        if (runner.projectId) {
            // is this a valid project? do we have access to it?
            const project = projectList.projects.find(p => p.id === runner.projectId);
            if (!project) {
                // if not, let the user choose a new project
                runner.projectId = undefined;
            }
        }

        if (!runner.projectId) {
            let projectChoices = (projectList.projects || []).map((p) => ({
                name: p.owner + " / " + p.name,
                value: p.id
            }));

            if (!projectChoices || projectChoices.length === 0) {
                throw new Error(`No projects found`);
            }

            let projectInq = await inquirer.prompt([
                {
                    type: "list",
                    choices: projectChoices,
                    name: "projectId",
                    message:
                        "Select a project to download training files and labels",
                    pageSize: 20
                }
            ]);

            this._projectId = Number(projectInq.projectId);

            await this._cliConfig.storeProjectId(this._projectId);
        }
        else {
            this._projectId = runner.projectId;
        }

        const projectInfo = await this._eiConfig.api.projects.getProjectInfo(this._projectId, { });

        console.log(CON_PREFIX, `Loading data from project "${projectInfo.project.owner} / ${projectInfo.project.name}" (ID: ${this._projectId}) ` +
            `(run with --clean to switch projects)`);

        let impulseRes = (
            await this._eiConfig.api.impulse.getImpulse(this._projectId, { })
        );

        if (!impulseRes.success) {
            console.error(CON_PREFIX,
                "Failed to retrieve learn block list...",
                impulseRes,
                impulseRes.error
            );
            process.exit(1);
        }

        if (!impulseRes.impulse || impulseRes.impulse.learnBlocks.length === 0) {
            console.error(CON_PREFIX,
                `Unable to find learn blocks for project id '${this._projectId}'. Create an impulse first.`
            );
            process.exit(1);
        }

        let learnBlockId: number;

        // https://github.com/edgeimpulse/edgeimpulse/issues/7799
        // if the learn block is deleted then set blockId back to undefined
        // so we ask about the block again...
        if (runner.blockId) {
            let block = impulseRes.impulse.learnBlocks.find(l => l.id === runner.blockId);
            if (!block) {
                runner.blockId = undefined;
            }
        }

        if (!runner.blockId) {
            let learnBlocks = impulseRes.impulse.learnBlocks;

            if (learnBlocks.length === 1) {
                learnBlockId = learnBlocks[0].id;
            }
            else {
                let learnInq = await inquirer.prompt([
                    {
                        type: "list",
                        choices: (learnBlocks || []).map((b) => ({
                            name: b.title,
                            value: b.id
                        })),
                        name: "learnBlockId",
                        message: "Select a learn block to download files and labels",
                        pageSize: 10
                    }
                ]);
                learnBlockId = Number(learnInq.learnBlockId);
            }

            await this._cliConfig.storeBlockId(learnBlockId);
        }
        else {
            learnBlockId = runner.blockId;
        }

        let learnBlockRes = (await this._eiConfig.api.learn.getKeras(this._projectId, learnBlockId));

        try {
            if (await this.checkFilesPresent(this._projectId) && !this._runnerOpts.downloadData) {
                console.log(CON_PREFIX, "Not downloading new data, " +
                    "if you want to fetch new data run edge-impulse-blocks runner --download-data");
            }
            else {
                let targetDir = typeof this._runnerOpts.downloadData === 'string' ?
                    this._runnerOpts.downloadData :
                    Path.join(process.cwd(), 'ei-block-data', this._projectId.toString());

                console.log(CON_PREFIX, `Downloading files from block "${learnBlockRes.name}" (run with --clean to switch blocks)...`);
                await this.downloadFiles(this._projectId, learnBlockId, targetDir);
                console.log(CON_PREFIX, `Downloading files from block "${learnBlockRes.name}" OK (stored in "${targetDir}")`);

                if (this._runnerOpts.downloadData) {
                    process.exit(0);
                }
            }

            let epochs = this._runnerOpts.epochs
                ? Number(this._runnerOpts.epochs)
                : (<{ epochs: number }>await inquirer.prompt([
                      {
                          type: "input",
                          name: "epochs",
                          message: "Number of training epochs",
                          default: '30'
                      }
                  ])).epochs;

            let learningRate = this._runnerOpts.learningRate
                ? Number(this._runnerOpts.learningRate)
                : (<{ learningRate: number }>await inquirer.prompt([
                      {
                          type: "input",
                          name: "learningRate",
                          message: "Learning rate",
                          default: '0.0005',
                      }
                  ])).learningRate;

            let validationSize = this._runnerOpts.validationSetSize
                ? Number(this._runnerOpts.validationSetSize)
                : 0.2;

            let inputShape = learnBlockRes.shape;

            this._dockerRunParams = {
                blockConfig: this._blockConfig,
                containerName: this._dockerBuildParams?.containerName,
                type: "transferLearning",
                epochs: epochs,
                learningRate: learningRate,
                validationSetSize: validationSize,
                inputShape: inputShape
            };
        }
        catch (ex) {
            let ex2 = <Error>ex;
            console.error(CON_PREFIX,
                "Failed to download files for transfer learning block",
                ex2.message || ex2.toString()
            );

            process.exit(1);
        }
    }

    async getDockerRunCommand() {
        if (!this._dockerRunParams) throw new Error("Unable to build command");

        let ret: { command: string; args: string[] } = {
            command: "docker",
            args: [ "run" ]
        };

        if (this._dockerRunParams.type !== "transferLearning") {
            throw new Error(
                `Invalid type (expected "transferLearning", but received "${this._dockerRunParams.type}")`
            );
        }

        ret.args = ret.args.concat([
            "--rm",
            "-v",
            Path.join(process.cwd(), 'ei-block-data', this._projectId.toString()) + ":/home",
            this._dockerRunParams.containerName || "",
            "--epochs",
            this._dockerRunParams.epochs.toString(),
            "--learning-rate",
            this._dockerRunParams.learningRate.toString(),
            "--validation-set-size",
            this._dockerRunParams.validationSetSize.toString(),
            "--input-shape",
            this._dockerRunParams.inputShape
        ]);

        if (this._runnerOpts.extraArgs) {
            ret.args = ret.args.concat(argvSplit(this._runnerOpts.extraArgs));
        }

        return ret;
    }

    async run(): Promise<void> {
        let buildCmd = await this.getDockerBuildCommand();
        let runCmd = await this.getDockerRunCommand();

        try {
            console.log(CON_PREFIX, 'Building container:', buildCmd.command, buildCmd.args.join(' '));
            await this.runAndWaitForCompletion(buildCmd, true);
            console.log(CON_PREFIX, 'Building container OK');
            console.log('');

            console.log(CON_PREFIX, 'Running container:', runCmd.command, runCmd.args.join(' '));
            await this.runAndWaitForCompletion(runCmd, true);
            console.log(CON_PREFIX, 'Running container OK');

            if (this._dockerRunParams?.type === 'transferLearning') {
                console.log(CON_PREFIX, 'Block output is in:',
                    Path.join('ei-block-data', this._projectId.toString()));
            }
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.error(CON_PREFIX,
                "Failed to run command:",
                ex.message || ex.toString()
            );
            process.exit(1);
        }
    }

    private async downloadFiles(
        projectId: number,
        learnId: number,
        targetDir: string,
    ): Promise<void> {

        let overrideImageInputScaling: models.ImageInputScaling | undefined;

        if (!this._blockConfig.config) {
            throw new Error('Block config is null');
        }

        if (this._blockConfig.config.id) {
            const blocks = (await this._eiConfig.api.organizationBlocks.listOrganizationTransferLearningBlocks(
                this._blockConfig.config.organizationId)).transferLearningBlocks;
            let block = blocks.find(x => x.id === this._blockConfig.config!.id);
            if (block) {
                overrideImageInputScaling = block.imageInputScaling;
                if (overrideImageInputScaling) {
                    console.log(CON_PREFIX, 'Using image input scaling:', overrideImageInputScaling,
                        `(read from block "${block.name}" (ID: ${block.id}) in Edge Impulse)`);
                }
            }
            else {
                overrideImageInputScaling = this._blockConfig.type === 'machine-learning' ?
                    this._blockConfig.parameters.info.imageInputScaling : undefined;
                if (overrideImageInputScaling) {
                    console.log(CON_PREFIX, 'Using image input scaling:', overrideImageInputScaling,
                        '(read from parameters.json)');
                }
            }
        }
        else {
            overrideImageInputScaling = this._blockConfig.type === 'machine-learning' ?
                this._blockConfig.parameters.info.imageInputScaling : undefined;
            if (overrideImageInputScaling) {
                console.log(CON_PREFIX, 'Using image input scaling:', overrideImageInputScaling,
                    '(read from parameters.json)');
            }
        }

        await fs.promises.mkdir(targetDir, { recursive: true });

        console.log(CON_PREFIX, 'Creating download job...');
        let job = await this._eiConfig.api.jobs.exportKerasBlockData(projectId, learnId, {
            overrideImageInputScaling: overrideImageInputScaling,
        });
        console.log(CON_PREFIX, 'Creating download job OK', job.id);
        await this._eiConfig.api.runJobUntilCompletion({
            type: 'project',
            projectId: projectId,
            jobId: job.id,
        }, x => {
            process.stdout.write(x);
        });
        console.log(CON_PREFIX, 'Download job completed, downloading data...');

        let zipFile = Path.join(targetDir, "data.zip");
        let data = await this._eiConfig.api.learn.downloadKerasData(projectId, learnId);
        await fs.promises.writeFile(
            zipFile,
            data
        );

        console.log(CON_PREFIX, 'Download completed, unzipping...');
        await extractFiles(zipFile, targetDir);
        await fs.promises.unlink(zipFile);
    }

    private async checkFilesPresent(projectId: number): Promise<boolean> {
        let targetDir = Path.join(process.cwd(), 'ei-block-data', projectId.toString());

        return (await fileExists(Path.join(targetDir, "X_train_features.npy")))
            &&
            (await fileExists(Path.join(targetDir, "y_train.npy")));
    }
}

export class BlockRunnerDeploy extends BlockRunner {
    private _projectId: number = -1;

    async setup(): Promise<void> {
        await super.setup();

        let runner = await this._cliConfig.getRunner();

        if (!runner.projectId) {
            // select the project
            let projectList = (await this._eiConfig.api.projects.listProjects());

            if (!projectList.success) {
                throw new Error(
                    `Failed to retrieve project list: ${projectList.error}`
                );
            }

            let projectChoices = (projectList.projects || []).map((p) => ({
                name: p.owner + " / " + p.name,
                value: p.id
            }));

            if (!projectChoices || projectChoices.length === 0) {
                throw new Error(`No projects found`);
            }

            let projectInq = await inquirer.prompt([
                {
                    type: "list",
                    choices: (projectList.projects || []).map((p) => ({
                        name: p.owner + " / " + p.name,
                        value: p.id
                    })),
                    name: "projectId",
                    message:
                        "Select a project to download files",
                    pageSize: 20
                }
            ]);

            this._projectId = Number(projectInq.projectId);

            await this._cliConfig.storeProjectId(this._projectId);
        }
        else {
            this._projectId = runner.projectId;
        }

        let projectInfo = (
            await this._eiConfig.api.projects.getProjectInfo(this._projectId, { })
        );

        if (!projectInfo.success) {
            throw new Error(`Failed to retrieve impulse: ${projectInfo.error}`);
        }

        if (!projectInfo.impulse.complete) {
            throw new Error("The impulse for this project is not complete");
        }

        // TODO: Might download learning block artifacts here too...
        let deployCheckRes = (
            await this._eiConfig.api.deployment.getDeployment(this._projectId, { type: "custom" })
        );

        if (!deployCheckRes.hasDeployment) {
            let projectReq: UpdateProjectRequest = {
                experiments: [ "custom_deploy" ]
            };

            let updateProjectRes = (
                await this._eiConfig.api.projects.updateProject(
                    this._projectId,
                    projectReq
                )
            );

            if (!updateProjectRes.success) {
                throw new Error(
                    `Error while enabling custom deployments: ${updateProjectRes.error}`
                );
            }

            console.log(CON_PREFIX, "Starting job to build custom block...");
            await this.buildBlock(this._projectId);
            console.log(CON_PREFIX, "Finished building");
        }

        let targetDir = (this._runnerOpts.type === 'deploy' && typeof this._runnerOpts.downloadData === 'string') ?
            this._runnerOpts.downloadData :
            Path.join(process.cwd(), 'ei-block-data', this._projectId.toString(), 'input');
        let zipDir = Path.join(process.cwd(), "ei-block-data", "download");

        console.log(CON_PREFIX, `Downloading build artifacts ZIP into ${zipDir}...`);
        await this.downloadFile(zipDir, "build-data.zip", this._projectId);
        console.log(CON_PREFIX, "Downloaded file");

        console.log(CON_PREFIX, `Unzipping into ${targetDir}...`);
        await extractFiles(Path.join(zipDir, "build-data.zip"), targetDir);
        console.log(CON_PREFIX, `Extracted into ${targetDir}`);

        if (this._runnerOpts.type === 'deploy' && this._runnerOpts.downloadData) {
            process.exit(0);
        }

        this._dockerRunParams = {
            blockConfig: this._blockConfig,
            type: "deploy",
            containerName: this._dockerBuildParams?.containerName
        };
    }

    async getDockerRunCommand() {
        if (!this._dockerRunParams) throw new Error("Unable to build command");

        let targetDir = Path.join(process.cwd(), "ei-block-data", this._projectId.toString());

        let ret: { command: string, args: string[] } = {
            command: "docker",
            args: [
                "run",
                "--rm",
                "-v",
                targetDir + ":/home",
                this._dockerRunParams.containerName || "",
                "--metadata",
                "/home/input/deployment-metadata.json"
            ]
        };

        if (this._runnerOpts.extraArgs) {
            ret.args = ret.args.concat(argvSplit(this._runnerOpts.extraArgs));
        }

        return ret;
    }

    private async buildBlock(projectId: number): Promise<void> {
        let jobStartRes = (
            await this._eiConfig.api.jobs.buildOnDeviceModelJob(
                projectId,
                { engine: "tflite" },
                { type: "custom" },
            )
        );

        if (!jobStartRes.success) {
            throw new Error(`Error while starting job: ${jobStartRes.error}`);
        }

        let jobId = jobStartRes.id;

        console.log(CON_PREFIX, `Started job with ID: ${jobId}`);

        await this._eiConfig.api.runJobUntilCompletion({
            type: 'project',
            projectId: projectId,
            jobId: jobId,
        }, data => {
            process.stdout.write(data);
        });
    }

    private async downloadFile(
        zipFileDir: string,
        zipFileName: string,
        projectId: number
    ): Promise<void> {
        // download custom block deployment
        let buildArtifacts = (
            await this._eiConfig.api.deployment.downloadBuild(projectId, { type: "custom" })
        );
        let downloadPath = Path.join(zipFileDir, zipFileName);

        if (!(await fileExists(zipFileDir))) {
            await fs.promises.mkdir(zipFileDir);
        }

        if (await fileExists(downloadPath)) {
            // delete the old file
            await fs.promises.unlink(downloadPath);
        }

        await fs.promises.writeFile(downloadPath, buildArtifacts);
    }
}

export class BlockRunnerDSP extends BlockRunner {
    private _port: number = -1;

    async setup(): Promise<void> {
        if (this._runnerOpts.type !== "dsp") {
            throw new Error(
                `Block type ${this._runnerOpts.type} is incorrect for DSP`
            );
        }

        await super.setup();

        if (!this._runnerOpts.port) {
            const dockerfilePath = Path.join(process.cwd(), 'Dockerfile');
            if (await pathExists(dockerfilePath)) {
                let dockerfileLines = (await fs.promises.readFile(dockerfilePath))
                    .toString('utf-8').split('\n');
                let exposeLine = dockerfileLines.find(x => x.toLowerCase().startsWith('expose'));
                let exposePort = Number(exposeLine?.toLowerCase().replace('expose ', ''));
                this._port = exposePort;
            }
            else {
                console.error(CON_PREFIX, `Error: Failed to determine the port that your DSP block would ` +
                    `run at. Specify --port to select the right port.`);
                process.exit(1);
            }
        }
        else {
            this._port = Number(this._runnerOpts.port);
        }

        console.log(CON_PREFIX, `Using port ${this._port}`);

        this._dockerRunParams = {
            blockConfig: this._blockConfig,
            containerName: this._dockerBuildParams?.containerName,
            type: "dsp",
            port: this._port
        };
    }

    async getDockerRunCommand() {
        if (!this._dockerRunParams) throw new Error("Unable to build command");

        if (this._dockerRunParams.type !== "dsp") {
            throw new Error(
                `Invalid type (expected "dsp", but received "${this._dockerRunParams.type}")`
            );
        }

        if (this._dockerRunParams.port === undefined) {
            throw new Error('Missing "port"');
        }

        let ret: { command: string, args: string[] } = {
            command: "docker",
            args: [
                "run",
                "-p",
                `${this._dockerRunParams.port}:${this._dockerRunParams.port}`,
                "--rm",
                this._dockerRunParams.containerName || ""
            ]
        };

        if (this._runnerOpts.extraArgs) {
            ret.args = ret.args.concat(argvSplit(this._runnerOpts.extraArgs));
        }

        return ret;
    }

    async run(): Promise<void> {
        try {
            if (!await this.checkInPath('ngrok')) {
                console.warn('');
                console.warn('Missing "ngrok" in PATH - this is required to run custom DSP blocks locally.');
                console.warn('Install via: https://ngrok.com');
                process.exit(1);
            }

            let buildCommand = await this.getDockerBuildCommand();
            let runCommand = await this.getDockerRunCommand();

            await this.runAndWaitForCompletion(buildCommand, true);

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.runAndWaitForCompletion(runCommand, true).catch((err) => {
                console.error(CON_PREFIX, "Failed to run container", err);
                process.exit(1);
            });

            await new Promise((resolve) => setTimeout(resolve, 1000));
            let publicUrl = await this.startNgrok(this._port);

            console.log('');
            console.log('Your DSP block is available at:', publicUrl);
            console.log(`Go to your project, select 'Create impulse > Add a processing block > Add custom block'.`);
            console.log('');
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.error(
                CON_PREFIX,
                "Failed to run command:",
                ex.stack || ex.toString()
            );
            process.exit(1);
        }
    }

    private checkInPath(command: string) {
        const isWin = os.platform().indexOf('win32') > -1;

        const where = isWin ? 'where' : 'which';

        const out = spawn(where, [ command ]);

        return new Promise<boolean>((resolve) => {
            out.on('close', (code) => {
                if (code === 0) {
                    return resolve(true);
                }
                else {
                    return resolve(false);
                }
            });
        });
    }

    private async startNgrok(port: number) {
        const p = spawn('ngrok', [ 'http', port.toString() ], {
            stdio: "pipe"
        });

        return new Promise<string>(async (resolve, reject2) => {
            p.on('close', code => {
                if (code !== 0) {
                    return reject2('ngrok failed to start (exit code: ' + code + ')');
                }
            });

            function getTunnels() {
                return new Promise((resolve3, reject3) => {
                    const options = {
                        hostname: 'localhost',
                        port: 4040,
                        path: '/api/tunnels',
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    };

                    try {
                        const req = http.request(options, (res) => {
                            if (res.statusCode !== 200) {
                                return reject3('Statuscode was not 200 but ' + res.statusCode);
                            }

                            let data = '';

                            res.on('data', (d: Buffer) => {
                                data += d.toString('utf8');
                            });
                            res.on('close', () => resolve3(JSON.parse(data)));
                        });

                        req.on('error', (e) => {
                            reject3(e);
                        });

                        req.end();
                    }
                    catch (ex2) {
                        reject3(ex2);
                    }
                });
            }

            for (let ix = 0; ix < 10; ix++) {
                try {
                    let tunnels = await getTunnels();

                    // eslint-disable-next-line
                    let foundTunnel = (<any>tunnels).tunnels.find((x: any) => x.proto === 'https');
                    if (!foundTunnel) {
                        throw new Error('Failed to find https tunnel');
                    }
                    // eslint-disable-next-line
                    let url = foundTunnel.public_url;
                    resolve(<string>url);
                }
                catch (ex) {
                    await new Promise((resolve4) => setTimeout(resolve4, 500));
                }
            }

            reject2('Failed to start ngrok within 5 seconds');
        });
    }
}

async function extractFiles(
    zipFileName: string,
    targetFolder: string
): Promise<void> {
    if (!(await fileExists(zipFileName))) {
        throw new Error(`Unable to find file ${zipFileName} for unzipping`);
    }

    await fs.promises.mkdir(targetFolder, { recursive: true });

    return new Promise<void>((resolve, reject) => {
        yauzl.open(zipFileName, { lazyEntries: true }, (err, zipFile) => {
            if (err) reject(new Error(err.toString()));
            if (!zipFile) reject(new Error("File to unzip is undefined"));

            if (zipFile) {
                zipFile.readEntry();

                zipFile.on("entry", async (entry: Entry) => {
                    try {
                        if (/\/$/.test(entry.fileName)) {
                            // A directory
                            await fs.promises.mkdir(
                                Path.join(targetFolder, entry.fileName)
                            );
                            zipFile.readEntry();
                        }
                        else {
                            zipFile.openReadStream(
                                entry,
                                (error2, readStream) => {
                                    if (error2) {
                                        reject(error2);
                                    }
                                    if (!readStream) {
                                        reject(
                                            new Error(
                                                "Unable to open file stream"
                                            )
                                        );
                                    }

                                    let writeStream = fs.createWriteStream(
                                        Path.join(
                                            targetFolder,
                                            entry.fileName
                                        ),
                                        { flags: "w" }
                                    );

                                    if (readStream) {
                                        readStream.pipe(writeStream);
                                    }

                                    writeStream.on("finish", () => {
                                        // @ts-ignore
                                        writeStream.close(() => {
                                            zipFile.readEntry();
                                        });

                                        writeStream.on("error", (error) => {
                                            zipFile.close();
                                            reject(
                                                new Error(
                                                    "Error reading ZIP entry: " + error
                                                )
                                            );
                                        });
                                    });
                                }
                            );
                        }
                    }
                    catch (ex) {
                        zipFile.close();
                        reject(new Error("Unable to read ZIP file"));
                    }
                });

                zipFile.on("end", () => {
                    resolve();
                });

                zipFile.on("error", (error) => {
                    zipFile.close();
                    reject(
                        new Error(
                            "Error reading ZIP file: " + error
                        )
                    );
                });
            }
        });
    });
}
