import fs from "fs";
import Path from "path";
import os from "os";
import tar from "tar";
import yauzl, { Entry } from "yauzl";
import { spawn, SpawnOptions } from "child_process";
import { Config, EdgeImpulseConfig } from "./config";
import { BlockConfigItem, exists } from "./blocks";
import inquirer from "inquirer";
import { split as argvSplit } from './argv-split';
import http from 'http';
import {
    ListOrganizationDataResponseAllOfData, OrganizationDataItemFiles,
    OrganizationTransformationBlock, UpdateProjectRequest,
    UploadCustomBlockRequestTypeEnum
} from "../sdk/studio";

const CON_PREFIX = '\x1b[34m[BLK]\x1b[0m';

export type DockerBuildParams = {
    blockConfig: BlockConfigItem;
    containerName: string;
};

export type DockerRunParams = {
    blockConfig: BlockConfigItem;
    type: UploadCustomBlockRequestTypeEnum;
    containerName: string | undefined;
} & (
    | ({
          type: "transform";
          operatesOn: "file" | "dataitem" | "standalone" | undefined;
          metadata?: string;
          hmacKey?: string;
      } & (
          | {
                operatesOn: "standalone";
            }
          | {
                operatesOn: "dataitem";
                dataItem: string;
                // path to directory of dataItem -> $PWD/datafolder/prefix/dataset/dataItem
                inDir: string;
            }
          | {
                operatesOn: "file";
                dataItem: string;
                // path to file from PWD/data/
                inFileDir: string;
                filename: string;
            }
      ))
    | {
          type: "transferLearning";
          epochs: number;
          learningRate: number;
          validationSetSize: number;
          inputShape: string;
      }
    | {
          type: "deploy";
      }
    | {
          type: "dsp";
          port: number;
      }
);

export type RunnerOptions = {
    container?: string;
    type: UploadCustomBlockRequestTypeEnum;
    extraArgs?: string;
} & (
    | {
          type: "transform";
          dataset?: string;
          dataItem?: string;
          file?: string;
          skipDownload?: boolean;
      }
    | {
          type: "transferLearning";
          epochs?: string;
          learningRate?: string;
          validationSetSize?: string;
          inputShape?: string;
          downloadData?: string | boolean;
      }
    | {
          type: "dsp";
          port?: string;
      }
    | {
          type: "deploy";
          downloadData?: string | boolean;
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
    protected _blockConfig: BlockConfigItem;
    protected _runnerOpts: RunnerOptions;
    protected _dockerBuildParams: DockerBuildParams | undefined;
    protected _dockerRunParams: DockerRunParams | undefined;

    constructor(
        cliConfig: Config,
        eiConfig: EdgeImpulseConfig,
        blockConfig: BlockConfigItem,
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
            args: ["build", "-t", this._dockerBuildParams.containerName, "."]
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
                p.stdout.on("data", (data: Buffer) => {
                    process.stdout.write(data);
                });

                p.stderr.on("data", (data: Buffer) => {
                    process.stderr.write(data);
                });
            }

            p.on("error", (err) => {
                process.stderr.write(err.toString());
            });

            p.on("exit", (code, signal) => {
                if (typeof code === "number" && code !== 0) {
                    reject("Command exited with code " + code);
                } else if (signal) {
                    reject("Terminated with signal " + signal);
                } else {
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
                p.stdout.on("data", (data: Buffer) => {
                    process.stdout.write(data);
                });

                p.stderr.on("data", (data: Buffer) => {
                    process.stderr.write(data);
                });
            }

            p.on("error", (err) => {
                process.stderr.write(err.toString());
            });

            p.on("exit", (code, signal) => {
                if (typeof code === "number" && code !== 0) {
                    reject("Command exited with code " + code);
                } else if (signal) {
                    reject("Terminated with signal " + signal);
                } else {
                    resolve();
                }
            });
        });
    }
}

export class BlockRunnerFactory {
    static async getRunner(
        type: UploadCustomBlockRequestTypeEnum,
        cliConfig: Config,
        eiConfig: EdgeImpulseConfig,
        blockConfig: BlockConfigItem,
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

            case "transferLearning":
                runner = new BlockRunnerTransferLearning(
                    cliConfig,
                    eiConfig,
                    blockConfig,
                    runnerOpts
                );
                break;

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

        let operatesOn = this._blockConfig.operatesOn;

        if (!operatesOn) {
            let transformBlocksRes = (
                await this._eiConfig.api.organizationBlocks.listOrganizationTransformationBlocks(
                    this._blockConfig.organizationId
                )
            );

            if (!this._blockConfig.id) {
                throw new Error(
                    "Local block has no ID. Try running `edge-impulse-blocks push` first"
                );
            }

            let foundBlock = transformBlocksRes.transformationBlocks.find(
                (el: OrganizationTransformationBlock) =>
                    el.id === this._blockConfig.id
            );

            if (!foundBlock) {
                throw new Error(
                    `Unable to retrieve block with id=${this._blockConfig.id} from the server`
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
            let dataItemName = "";

            if (!this._runnerOpts.dataItem) {
                let dataItemInq = <{ dataItemName: string }>await inquirer.prompt([
                    {
                        type: "input",
                        name: "dataItemName",
                        message:
                            "What is the name of the data item you would like to use?"
                    }
                ]);

                dataItemName = dataItemInq.dataItemName;
            }
            else {
                dataItemName = this._runnerOpts.dataItem;
            }

            this._dataItem = await this.getDataItemByName(
                this._runnerOpts.dataset,
                dataItemName,
                this._blockConfig.organizationId,
                this._eiConfig
            );

            if (operatesOn === "dataitem") {
                let downloadDir = Path.join(
                    process.cwd(),
                    'ei-block-data',
                );

                await this.downloadAndExtractFiles(downloadDir);

                this._dockerRunParams = {
                    blockConfig: this._blockConfig,
                    containerName: this._dockerBuildParams?.containerName,
                    type: "transform",
                    operatesOn: "dataitem",
                    metadata: JSON.stringify(this._dataItem.metadata),
                    hmacKey: "0",
                    dataItem: this._dataItem.name,
                    inDir: Path.join(downloadDir, this._dataItem.bucketPath)
                };
            }
            else if (operatesOn === "file") {
                let downloadDir = Path.join(
                    process.cwd(),
                    'ei-block-data',
                    this._dataItem.dataset.toLowerCase().replace(/\s/g, '-').replace(/[\.]/g, ''),
                    this._dataItem.name
                );

                let file = await this.downloadFile(downloadDir);

                this._dockerRunParams = {
                    blockConfig: this._blockConfig,
                    containerName: this._dockerBuildParams?.containerName,
                    type: "transform",
                    operatesOn: "file",
                    metadata: JSON.stringify(this._dataItem.metadata),
                    hmacKey: "0",
                    dataItem: this._dataItem.name,
                    inFileDir: file.fileDir,
                    filename: file.filename
                };
            }
        }
    }

    async getDockerRunCommand(): Promise<{ command: string; args: string[] }> {
        if (!this._dockerRunParams) throw new Error("Unable to build command");

        let ret: { command: string; args: string[] } = {
            command: "docker",
            args: ["run"]
        };

        if (this._dockerRunParams.type !== "transform") {
            throw new Error(
                `Invalid type (expected "transform", but received "${this._dockerRunParams.type}")`
            );
        }

        let env = [
            `EI_ORGANIZATION_ID=${this._blockConfig.organizationId.toString()}`,
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

        if (this._dockerRunParams.operatesOn === "dataitem") {
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
        } else if (this._dockerRunParams.operatesOn === "file") {
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
        } else if (this._dockerRunParams.operatesOn === "standalone") {
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
                else if (this._dockerRunParams.operatesOn === 'dataitem') {
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

    private async downloadAndExtractFiles(path: string) {
        if (!this._dataItem) throw new Error("No data item specified");
        if (this._runnerOpts.type === 'transform' && this._runnerOpts.skipDownload) return;

        let currentFolderSize = 0;
        let extractFolder = Path.join(path, this._dataItem.bucketPath);

        await fs.promises.mkdir(extractFolder, { recursive: true });

        if (await fileExists(extractFolder)) {
            let files = await fs.promises.readdir(extractFolder);

            for (let filename of files) {
                let fileInfo = await fs.promises.stat(Path.join(extractFolder, filename));

                if (fileInfo.isFile()) {
                    currentFolderSize += fileInfo.size;
                }
            }
        }

        if (this._dataItem.totalFileSize === currentFolderSize) {
            console.log(CON_PREFIX, 'Files already present, skipping download');
            return;
        }

        console.log(CON_PREFIX, `Downloading and extracting files to ${Path.relative(process.cwd(), path)}...`);

        // download raw Buffer (a tarball)
        let fileRes =
            await this._eiConfig.api.organizationData.downloadOrganizationSingleDataItem(
                this._blockConfig.organizationId,
                this._dataItem.id
            );

        await fs.promises.mkdir(path);

        let targetFilePath = Path.join(
            path,
            `data-item-${this._dataItem.name}.tar`
        );

        let rawBuffer = fileRes;
        await fs.promises.writeFile(targetFilePath, rawBuffer);

        // extract and save files
        // path to files is BUCKET_PATH (<PREFIX>/<DATASET>/<DATA_ITEM_NAME>/*)

        await tar.extract({
            file: targetFilePath,
            cwd: path
        });

        // delete tarball
        await fs.promises.unlink(targetFilePath);

        await fs.promises.mkdir(
            Path.join(path, this._dataItem.bucketPath, "out")
        );

        console.log(CON_PREFIX, "Done extracting files");
    }

    private async downloadFile(fileDir: string): Promise<{ fileDir: string, filename: string }> {
        if (!this._dataItem) throw new Error("No data item specified");

        if (this._runnerOpts.type !== 'transform') {
            throw new Error(`Incompatible block type: ${this._runnerOpts.type}`);
        }

        let filename = this._runnerOpts.file ? this._runnerOpts.file : "";

        if (this._runnerOpts.type === 'transform' && this._runnerOpts.skipDownload) {
            return { fileDir: fileDir, filename: filename };
        }

        await fs.promises.mkdir(fileDir, { recursive: true });

        // grab list of files in data item
        let fileListRes = (
            await this._eiConfig.api.organizationData.getOrganizationDataItem(
                this._blockConfig.organizationId,
                this._dataItem.id
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
                this._blockConfig.organizationId,
                this._dataItem.id,
                filename
            )
        );

        await fs.promises.writeFile(filePath, file);

        console.log(CON_PREFIX, `File downloaded`);

        return { fileDir: fileDir, filename: filename };
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
            await config.api.organizationData.listOrganizationData(
                organizationId,
                undefined,
                queryFilter,
                1
            )
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
        if (this._runnerOpts.type !== "transferLearning") {
            throw new Error(
                `Block type ${this._runnerOpts.type} is not transferLearning`
            );
        }

        await super.setup();

        let runner = await this._cliConfig.getRunner();

        if (!runner.projectId) {
            // Select a project
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

        console.log(CON_PREFIX, `Selecting project with ID ${this._projectId}`);

        let impulseRes = (
            await this._eiConfig.api.impulse.getImpulse(this._projectId)
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
                `Unable to find learn blocks for project id '${this._projectId}'`
            );
            process.exit(1);
        }

        let learnBlockId = -1;

        if (!runner.blockId) {
            let learnBlocks = impulseRes.impulse.learnBlocks.filter(x => x.primaryVersion);

            if (learnBlocks.length === 1) {
                learnBlockId = learnBlocks[0].id;
            } else {
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

        if (!learnBlockRes.success) {
            console.error(CON_PREFIX, 'Unable to retrieve learning block data', learnBlockRes.error);
        }

        try {
            if (await this.checkFilesPresent(this._projectId) && !this._runnerOpts.downloadData) {
                console.log(CON_PREFIX, "Not downloading new data, " +
                    "if you want to fetch new data run edge-impulse-blocks runner --download-data");
            }
            else {
                let targetDir = typeof this._runnerOpts.downloadData === 'string' ?
                    this._runnerOpts.downloadData :
                    Path.join(process.cwd(), 'ei-block-data', this._projectId.toString());

                console.log(CON_PREFIX, "Downloading files...");
                await this.downloadFiles(this._projectId, learnBlockId, targetDir);
                console.log(CON_PREFIX, `Training files downloaded to`, targetDir);

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
        } catch (ex) {
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
            args: ["run"]
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

        await fs.promises.mkdir(targetDir, { recursive: true });

        console.log(CON_PREFIX, 'Creating download job...');
        let job = await this._eiConfig.api.jobs.exportKerasBlockData(projectId, learnId);
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
            await this._eiConfig.api.projects.getProjectInfo(this._projectId)
        );

        if (!projectInfo.success) {
            throw new Error(`Failed to retrieve impulse: ${projectInfo.error}`);
        }

        if (!projectInfo.impulse.complete) {
            throw new Error("The impulse for this project is not complete");
        }

        // TODO: Might download learning block artifacts here too...
        let deployCheckRes = (
            await this._eiConfig.api.deployment.getDeployment(this._projectId, "custom")
        );

        if (!deployCheckRes.hasDeployment) {
            let projectReq: UpdateProjectRequest = {
                experiments: ["custom_deploy"]
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
                "custom",
                { engine: "tflite" }
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
            await this._eiConfig.api.deployment.downloadBuild(projectId, "custom")
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
            if (await exists(dockerfilePath)) {
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

            // // tslint:disable-next-line: no-floating-promises
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

                    // tslint:disable-next-line: no-unsafe-any
                    let foundTunnel = (<any>tunnels).tunnels.find((x: any) => x.proto === 'https');
                    if (!foundTunnel) {
                        throw new Error('Failed to find https tunnel');
                    }
                    // tslint:disable-next-line: no-unsafe-any
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
                    } catch (ex) {
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
