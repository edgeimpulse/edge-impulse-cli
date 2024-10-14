import { EdgeImpulseConfig } from "../config";
import inquirer from 'inquirer';
import Path from 'path';
import { guessRepoUrl, pathExists } from "./blocks-helper";
import fs from 'fs';
import * as models from  '../../sdk/studio/sdk/model/models';
import { BlockConfigManager } from "./block-config-manager";
import {
    DeployBlockParametersJson, DSPBlockParametersJson,
    MachineLearningBlockParametersJson, SyntheticDataBlockParametersJson,
    TransformBlockParametersJson
} from "./parameter-types";
import { CLIBlockType, DSPParameterItem } from "../../shared/parameters-json-types";

export class InitCLIBlock {
    private _config: EdgeImpulseConfig;
    private _folder: string;
    private _paths: {
        eiBlockConfig: string,
        parametersJson: string,
    };
    private _blockConfigManager: BlockConfigManager;

    constructor(config: EdgeImpulseConfig, folder: string,
                blockConfigManager: BlockConfigManager
    ) {
        this._config = config;
        this._folder = folder;
        this._paths = {
            eiBlockConfig: Path.join(folder, '.ei-block-config'),
            parametersJson: Path.join(folder, 'parameters.json'),
        };
        this._blockConfigManager = blockConfigManager;
    }

    async getOrganization() {
        const config = this._config;

        // Select the organization
        let organizations = await config.api.organizations.listOrganizations();
        let organizationId: number;
        if (!organizations.organizations || organizations.organizations.length === 0) {
            throw new Error('User is not part of any Edge Impulse organizations. You can only use custom blocks if ' +
                'you have access to the enterprise version of Edge Impulse. You can log in with a new account via ' +
                '`edge-impulse-blocks --clean`.');
        }
        else if (organizations.organizations && organizations.organizations.length === 1) {
            organizationId = organizations.organizations[0].id;
        }
        else {
            let orgInqRes = await inquirer.prompt([{
                type: 'list',
                choices: (organizations.organizations || []).map(p => {
                    let name = p.name;
                    if (p.isDeveloperProfile) {
                        name += ' (personal account)';
                    }

                    return {
                        name: name,
                        value: p.id,
                    };
                }),
                name: 'organization',
                message: 'In which organization do you want to create this block?',
                pageSize: 20
            }]);
            organizationId = Number(orgInqRes.organization);
        }

        const organizationInfo = (await config.api.organizations.getOrganizationInfo(organizationId));

        return organizationInfo;
    }

    async initBlock(type: CLIBlockType, organizationInfo: models.OrganizationInfoResponse) {
        switch (type) {
            case 'dsp':
                return await this.initDSPBlock(organizationInfo);
            case 'deploy':
                return await this.initDeployBlock(organizationInfo);
            case 'machine-learning':
                return await this.initMachineLearningBlock(organizationInfo);
            case 'synthetic-data':
                return await this.initSyntheticDataBlock(organizationInfo);
            case 'transform':
                return await this.initTransformBlock(organizationInfo);
            default:
                throw new Error(`initBlock missing type "${type}"`);
        }
    }

    private async initDSPBlock(organizationInfo: models.OrganizationInfoResponse) {
        const organizationId = organizationInfo.organization.id;
        const api = this._config.api;

        let parameters: DSPBlockParametersJson | undefined;

        if (await pathExists(this._paths.parametersJson)) {
            parameters = <DSPBlockParametersJson>JSON.parse(await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));

            if (!parameters.version || !parameters.type) {
                parameters = {
                    version: parameters.version || 1,
                    type: parameters.type || 'dsp',
                    info: parameters.info,
                    parameters: parameters.parameters,
                };
                await this._blockConfigManager.saveParameters(parameters);
            }
        }

        let existingBlocks = (await api.organizationBlocks.listOrganizationDspBlocks(organizationId)).dspBlocks;

        let createOrUpdateInqRes = await this.createOrUpdate(existingBlocks);

        let selectedBlock: models.OrganizationDspBlock | undefined;

        if (createOrUpdateInqRes === 'update') {
            selectedBlock = await this.selectExistingBlock(existingBlocks);
        }

        if (!parameters) {
            console.log('');
            console.log(`You'll need a parameters.json file describing this block before you can push it.`);
            console.log(`See https://docs.edgeimpulse.com/docs/edge-impulse-studio/processing-blocks/custom-blocks`);
        }

        await this._blockConfigManager.saveConfig({
            organizationId: organizationId,
            id: selectedBlock ? selectedBlock.id : undefined,
        });
    }

    private async initDeployBlock(organizationInfo: models.OrganizationInfoResponse) {
        const organizationId = organizationInfo.organization.id;
        const api = this._config.api;

        let existingBlocks = (await api.organizationBlocks.listOrganizationDeployBlocks(organizationId)).deployBlocks;

        let createOrUpdateInqRes = await this.createOrUpdate(existingBlocks);

        let selectedBlock: models.OrganizationDeployBlock | undefined;

        if (createOrUpdateInqRes === 'update') {
            selectedBlock = await this.selectExistingBlock(existingBlocks);
        }

        let params: DeployBlockParametersJson | undefined;
        if (await pathExists(this._paths.parametersJson)) {
            params = <DeployBlockParametersJson>JSON.parse(
                await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
            if (!params.version) {
                params.version = 1;
            }
            params.type = 'deploy';
            params.info = params.info || { };
        }

        let blockName: string;
        if (params?.info?.name) {
            blockName = params.info.name;
        }
        else if (selectedBlock?.name) {
            blockName = selectedBlock.name;
        }
        else {
            blockName = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'name',
                message: 'Enter the name of your block (min. 2 characters)',
            }])).name;
            if (blockName.length < 2) {
                throw new Error('New block must have a name longer than 2 characters.');
            }
        }

        let blockDescription: string;
        if (params?.info?.description) {
            blockDescription = params.info.description;
        }
        else if (selectedBlock?.description) {
            blockDescription = selectedBlock.description;
        }
        else {
            blockDescription = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'description',
                message: 'Enter the description of your block',
            }])).description;
        }

        let category: 'library' | 'firmware';
        if (params?.info?.category) {
            category = params.info.category;
        }
        else if (selectedBlock?.category) {
            category = selectedBlock.category;
        }
        else {
            category = <'library' | 'firmware'>(await inquirer.prompt([{
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

        let integrateUrl: string | undefined;
        if (params?.info?.integrateUrl) {
            integrateUrl = params.info.integrateUrl;
        }
        else if (selectedBlock?.integrateUrl) {
            integrateUrl = selectedBlock.integrateUrl;
        }
        else {
            integrateUrl = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'integrateUrl',
                message: 'Do you have an integration URL (shown after deployment, e.g. your docs page), leave empty to skip',
            }])).integrateUrl;
            if (!integrateUrl) {
                integrateUrl = undefined;
            }
        }

        let cliArguments: string | undefined;
        if (params?.info?.cliArguments) {
            cliArguments = params.info.cliArguments;
        }
        else if (selectedBlock?.integrateUrl) {
            cliArguments = selectedBlock.integrateUrl;
        }
        else {
            cliArguments = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'cliArguments',
                message: 'CLI arguments to pass to this block (optional)',
                default: '',
            }])).cliArguments;
        }

        let mountLearnBlock: boolean;
        if (typeof params?.info?.mountLearnBlock === 'boolean') {
            mountLearnBlock = params.info.mountLearnBlock;
        }
        else if (typeof selectedBlock?.mountLearnBlock === 'boolean') {
            mountLearnBlock = selectedBlock.mountLearnBlock;
        }
        else {
            const resp = await inquirer.prompt({
                type: 'confirm',
                name: 'mountLearnBlock',
                message: `Mount learn block output under /data? ` +
                    `Useful if you need access to raw learn block output, only ` +
                    `supported if you have one learn block in your impulse.`,
                default: false,
            });
            mountLearnBlock = <boolean>resp.mountLearnBlock;
        }

        let supportsEonCompiler: boolean;
        if (typeof params?.info?.supportsEonCompiler === 'boolean') {
            supportsEonCompiler = params.info.supportsEonCompiler;
        }
        else if (typeof selectedBlock?.supportsEonCompiler === 'boolean') {
            supportsEonCompiler = selectedBlock.supportsEonCompiler;
        }
        else {
            const resp = await inquirer.prompt({
                type: 'confirm',
                name: 'supportsEonCompiler',
                message: `Does this deployment block support the EON Compiler? ` +
                    `If so, we'll pass EON Compiler output to this block.`,
                default: true,
            });
            supportsEonCompiler = <boolean>resp.supportsEonCompiler;
        }

        let showOptimizations: boolean;
        if (typeof params?.info?.showOptimizations === 'boolean') {
            showOptimizations = params.info.showOptimizations;
        }
        else if (typeof selectedBlock?.showOptimizations === 'boolean') {
            showOptimizations = selectedBlock.showOptimizations;
        }
        else {
            const resp = await inquirer.prompt({
                type: 'confirm',
                name: 'showOptimizations',
                message: `Show optimizations panel? ` +
                    `If disabled the optimizations panel (where you pick e.g. int8 quantized models) is hidden. ` +
                    `Disable this if your block operates on e.g. a SavedModel or ONNX file and does its own ` +
                    `optimization.`,
                default: true,
            });
            showOptimizations = <boolean>resp.showOptimizations;
        }

        let privileged: boolean;
        if (typeof params?.info?.privileged === 'boolean') {
            privileged = params.info.privileged;
        }
        else if (typeof selectedBlock?.privileged === 'boolean') {
            privileged = selectedBlock.privileged;
        }
        else {
            privileged = false;
        }

        if (!params) {
            params = {
                version: 1,
                type: 'deploy',
                info: {
                    name: blockName,
                    description: blockDescription,
                    category: category,
                    integrateUrl: integrateUrl,
                    mountLearnBlock: mountLearnBlock,
                    supportsEonCompiler: supportsEonCompiler,
                    showOptimizations: showOptimizations,
                    cliArguments: cliArguments,
                    privileged: privileged,
                }
            };
        }
        else {
            params.info.name = blockName;
            params.info.description = blockDescription;
            params.info.category = category;
            params.info.integrateUrl = integrateUrl;
            params.info.mountLearnBlock = mountLearnBlock;
            params.info.supportsEonCompiler = supportsEonCompiler;
            params.info.showOptimizations = showOptimizations;
            params.info.cliArguments = cliArguments;
            params.info.privileged = privileged;
        }

        await this._blockConfigManager.saveParameters(params);

        await this._blockConfigManager.saveConfig({
            organizationId: organizationId,
            id: selectedBlock ? selectedBlock.id : undefined,
        });
    }

    private async initMachineLearningBlock(organizationInfo: models.OrganizationInfoResponse) {
        const organizationId = organizationInfo.organization.id;
        const api = this._config.api;

        let existingBlocks = (
            await api.organizationBlocks.listOrganizationTransferLearningBlocks(organizationId)).transferLearningBlocks;

        let createOrUpdateInqRes = await this.createOrUpdate(existingBlocks);

        let selectedBlock: models.OrganizationTransferLearningBlock | undefined;

        if (createOrUpdateInqRes === 'update') {
            selectedBlock = await this.selectExistingBlock(existingBlocks);
        }

        let params: MachineLearningBlockParametersJson | undefined;
        if (await pathExists(this._paths.parametersJson)) {
            params = <MachineLearningBlockParametersJson>JSON.parse(
                await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
            if (Array.isArray(params)) {
                // old version, was only an array of parameters
                params = {
                    version: 1,
                    type: 'machine-learning',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    info: <any>{ }, // <-- will be filled in below, so this is fine
                    parameters: <DSPParameterItem[]>params,
                };
            }
            else {
                if (!params.version) {
                    params.version = 1;
                }
                params.type = 'machine-learning';
                params.info = params.info || { };
            }
        }

        let blockName: string;
        if (params?.info?.name) {
            blockName = params.info.name;
        }
        else if (selectedBlock?.name) {
            blockName = selectedBlock.name;
        }
        else {
            blockName = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'name',
                message: 'Enter the name of your block (min. 2 characters)',
            }])).name;
            if (blockName.length < 2) {
                throw new Error('New block must have a name longer than 2 characters.');
            }
        }

        let blockDescription: string;
        if (params?.info?.description) {
            blockDescription = params.info.description;
        }
        else if (selectedBlock?.description) {
            blockDescription = selectedBlock.description;
        }
        else {
            blockDescription = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'description',
                message: 'Enter the description of your block',
            }])).description;
        }

        let blockTlOperatesOn: models.OrganizationTransferLearningOperatesOn;
        if (params?.info?.operatesOn) {
            blockTlOperatesOn = params.info.operatesOn;
        }
        else if (selectedBlock?.operatesOn) {
            blockTlOperatesOn = selectedBlock.operatesOn;
        }
        else {
            blockTlOperatesOn = <models.OrganizationTransferLearningOperatesOn>(await inquirer.prompt([{
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
                        name: 'Classification',
                        value: 'other'
                    },
                    {
                        name: 'Regression',
                        value: 'regression'
                    },
                ],
                message: 'What type of data does this model operate on?',
            }])).operatesOn;
        }

        let blockTlImageInputScaling: models.ImageInputScaling | undefined;
        if (blockTlOperatesOn === 'image' || blockTlOperatesOn === 'object_detection') {
            if (params?.info?.imageInputScaling) {
                blockTlImageInputScaling = params.info.imageInputScaling;
            }
            else if (selectedBlock?.imageInputScaling) {
                blockTlImageInputScaling = selectedBlock.imageInputScaling;
            }
            else {
                blockTlImageInputScaling = <models.ImageInputScaling>(await inquirer.prompt([{
                    type: 'list',
                    name: 'inputScaling',
                    choices: organizationInfo.cliLists.imageInputScalingOptions.map(o => {
                        return {
                            name: o.label,
                            value: o.value,
                        };
                    }),
                    message: 'How is your input scaled?',
                    default: '0..1'
                }])).inputScaling;
            }
        }

        let blockTlObjectDetectionLastLayer: models.ObjectDetectionLastLayer | undefined;
        if (blockTlOperatesOn === 'object_detection') {
            if (params?.info?.objectDetectionLastLayer) {
                blockTlObjectDetectionLastLayer = params.info.objectDetectionLastLayer;
            }
            else if (selectedBlock?.objectDetectionLastLayer) {
                blockTlObjectDetectionLastLayer = selectedBlock.objectDetectionLastLayer;
            }
            else {
                blockTlObjectDetectionLastLayer = <models.ObjectDetectionLastLayer>
                    (await inquirer.prompt([{
                        type: 'list',
                        name: 'lastLayer',
                        choices: organizationInfo.cliLists.objectDetectionLastLayerOptions.map(o => {
                            return {
                                name: o.label,
                                value: o.value,
                            };
                        }),
                        message: `What's the last layer of this object detection model?`,
                    }])).lastLayer;
                }
        }

        let blockIndRequiresGpu: boolean | undefined;
        if (typeof params?.info?.indRequiresGpu === 'boolean') {
            blockIndRequiresGpu = params.info.indRequiresGpu;
        }
        else if (selectedBlock?.indRequiresGpu) {
            blockIndRequiresGpu = selectedBlock.indRequiresGpu;
        }
        else {
            let blockTlCanRunWhere = <'gpu' | 'cpu-or-gpu'>(await inquirer.prompt([{
                type: 'list',
                name: 'canRunWhere',
                default: 'cpu-or-gpu',
                choices: [
                    {
                        name: 'Both CPU or GPU (default)',
                        value: 'cpu-or-gpu'
                    },
                    {
                        name: 'Only on GPU (GPUs are only available for enterprise projects)',
                        value: 'gpu'
                    },
                ],
                message: 'Where can your model train?',
            }])).canRunWhere;
            blockIndRequiresGpu = blockTlCanRunWhere === 'gpu';
        }

        let repoUrl: string | undefined;
        if (params?.info?.repositoryUrl) {
            repoUrl = params.info.repositoryUrl;
        }
        else if (selectedBlock?.repositoryUrl) {
            repoUrl = selectedBlock.repositoryUrl;
        }
        else {
            repoUrl = await guessRepoUrl();
        }

        let customModelVariants: models.OrganizationTransferLearningBlockCustomVariant[] | undefined;
        if (params?.info?.customModelVariants) {
            customModelVariants = params.info.customModelVariants;
        }
        else if (selectedBlock?.customModelVariants) {
            customModelVariants = selectedBlock.customModelVariants;
        }

        let displayCategory: models.BlockDisplayCategory | undefined;
        if (params?.info?.displayCategory) {
            displayCategory = params.info.displayCategory;
        }
        else if (selectedBlock?.displayCategory) {
            displayCategory = selectedBlock.displayCategory;
        }

        if (!params) {
            params = {
                version: 1,
                type: 'machine-learning',
                info: {
                    name: blockName,
                    description: blockDescription,
                    operatesOn: blockTlOperatesOn,
                    imageInputScaling: blockTlImageInputScaling,
                    indRequiresGpu: blockIndRequiresGpu,
                    objectDetectionLastLayer: blockTlObjectDetectionLastLayer,
                    repositoryUrl: repoUrl,
                    customModelVariants: customModelVariants,
                    displayCategory: displayCategory,
                },
                parameters: [],
            };
        }
        else {
            params.info.name = blockName;
            params.info.description = blockDescription;
            params.info.operatesOn = blockTlOperatesOn;
            params.info.imageInputScaling = blockTlImageInputScaling;
            params.info.indRequiresGpu = blockIndRequiresGpu;
            params.info.objectDetectionLastLayer = blockTlObjectDetectionLastLayer;
            params.info.repositoryUrl = repoUrl;
            params.info.customModelVariants = customModelVariants;
            params.info.displayCategory = displayCategory;
        }

        await this._blockConfigManager.saveParameters(params);

        await this._blockConfigManager.saveConfig({
            organizationId: organizationId,
            id: selectedBlock ? selectedBlock.id : undefined,
        });
    }

    private async initSyntheticDataBlock(organizationInfo: models.OrganizationInfoResponse) {
        const organizationId = organizationInfo.organization.id;
        const api = this._config.api;

        let existingBlocks = (
            await api.organizationBlocks.listOrganizationTransformationBlocks(organizationId)).transformationBlocks
                .filter(x => x.showInSyntheticData);

        let createOrUpdateInqRes = await this.createOrUpdate(existingBlocks);

        let selectedBlock: models.OrganizationTransformationBlock | undefined;

        if (createOrUpdateInqRes === 'update') {
            selectedBlock = await this.selectExistingBlock(existingBlocks);
        }

        let params: SyntheticDataBlockParametersJson | undefined;
        if (await pathExists(this._paths.parametersJson)) {
            params = <SyntheticDataBlockParametersJson>JSON.parse(
                await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
            if (Array.isArray(params)) {
                // old version, was only an array of parameters
                params = {
                    version: 1,
                    type: 'synthetic-data',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    info: <any>{ }, // <-- will be filled in below, so this is fine
                    parameters: <DSPParameterItem[]>params,
                };
            }
            else {
                if (!params.version) {
                    params.version = 1;
                }
                params.type = 'synthetic-data';
                params.info = params.info || { };
            }
        }

        let blockName: string;
        if (params?.info?.name) {
            blockName = params.info.name;
        }
        else if (selectedBlock?.name) {
            blockName = selectedBlock.name;
        }
        else {
            blockName = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'name',
                message: 'Enter the name of your block (min. 2 characters)',
            }])).name;
            if (blockName.length < 2) {
                throw new Error('New block must have a name longer than 2 characters.');
            }
        }

        let blockDescription: string;
        if (params?.info?.description) {
            blockDescription = params.info.description;
        }
        else if (selectedBlock?.description) {
            blockDescription = selectedBlock.description;
        }
        else {
            blockDescription = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'description',
                message: 'Enter the description of your block',
            }])).description;
        }

        if (!params) {
            params = {
                version: 1,
                type: 'synthetic-data',
                info: {
                    name: blockName,
                    description: blockDescription,
                },
                parameters: [],
            };
        }
        else {
            params.info.name = blockName;
            params.info.description = blockDescription;
        }

        await this._blockConfigManager.saveParameters(params);

        await this._blockConfigManager.saveConfig({
            organizationId: organizationId,
            id: selectedBlock ? selectedBlock.id : undefined,
        });
    }

    private async initTransformBlock(organizationInfo: models.OrganizationInfoResponse) {
        const organizationId = organizationInfo.organization.id;
        const api = this._config.api;

        let existingBlocks = (
            await api.organizationBlocks.listOrganizationTransformationBlocks(organizationId)).transformationBlocks
                .filter(x => !x.showInDataSources);

        let createOrUpdateInqRes = await this.createOrUpdate(existingBlocks);

        let selectedBlock: models.OrganizationTransformationBlock | undefined;

        if (createOrUpdateInqRes === 'update') {
            selectedBlock = await this.selectExistingBlock(existingBlocks);
        }

        let params: TransformBlockParametersJson | undefined;
        if (await pathExists(this._paths.parametersJson)) {
            params = <TransformBlockParametersJson>JSON.parse(
                await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
            if (Array.isArray(params)) {
                // old version, was only an array of parameters
                params = {
                    version: 1,
                    type: 'transform',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    info: <any>{ }, // <-- will be filled in below, so this is fine
                    parameters: <DSPParameterItem[]>params,
                };
            }
            else {
                if (!params.version) {
                    params.version = 1;
                }
                params.type = 'transform';
                params.info = params.info || { };
            }
        }

        let blockName: string;
        if (params?.info?.name) {
            blockName = params.info.name;
        }
        else if (selectedBlock?.name) {
            blockName = selectedBlock.name;
        }
        else {
            blockName = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'name',
                message: 'Enter the name of your block (min. 2 characters)',
            }])).name;
            if (blockName.length < 2) {
                throw new Error('New block must have a name longer than 2 characters.');
            }
        }

        let blockDescription: string;
        if (params?.info?.description) {
            blockDescription = params.info.description;
        }
        else if (selectedBlock?.description) {
            blockDescription = selectedBlock.description;
        }
        else {
            blockDescription = <string>(await inquirer.prompt([{
                type: 'input',
                name: 'description',
                message: 'Enter the description of your block',
            }])).description;
        }

        let blockOperatesOn: 'file' | 'directory' | 'standalone' | undefined;
        if (params?.info?.operatesOn) {
            blockOperatesOn = params.info.operatesOn;
        }
        else if (selectedBlock?.operatesOn) {
            blockOperatesOn = selectedBlock.operatesOn;
        }
        else {
            blockOperatesOn = <'file' | 'directory' | 'standalone'>(await inquirer.prompt([{
                type: 'list',
                name: 'operatesOn',
                choices: [
                    {
                        name: 'File (--in-file passed into the block)',
                        value: 'file'
                    },
                    {
                        name: 'Directory (--in-directory passed into the block)',
                        value: 'directory'
                    },
                    {
                        name: 'Standalone (runs the container, but no files / directories passed in)',
                        value: 'standalone'
                    }
                ],
                message: 'What type of data does this block operate on?',
            }])).operatesOn;
        }

        let transformMountpoints: {
            bucketId: number;
            mountPoint: string;
        }[] | undefined;
        if (params?.info?.transformMountpoints) {
            transformMountpoints = params.info.transformMountpoints;
        }
        else if (selectedBlock) {
            transformMountpoints = selectedBlock.additionalMountPoints.filter(mp => mp.bucketId).map(mp => {
                return {
                    bucketId: mp.bucketId!,
                    mountPoint: mp.mountPoint,
                };
            });
        }
        else {
            let buckets = await this._config.api.organizationData.listOrganizationBuckets(organizationId);
            if (buckets.buckets && buckets.buckets.length > 0) {
                transformMountpoints = (<string[]>(await inquirer.prompt([{
                    type: 'checkbox',
                    name: 'buckets',
                    choices: buckets.buckets.map(x => {
                        return {
                            name: x.bucket,
                            value: x.id.toString()
                        };
                    }),
                    message: 'Which buckets do you want to mount into this block ' +
                        '(will be mounted under /mnt/s3fs/BUCKET_NAME, you can change these mount points in the Studio)?',
                }])).buckets).map(y => {
                    let b = buckets.buckets?.find(z => z.id === Number(y));
                    return {
                        bucketId: Number(y),
                        mountPoint: b ? ('/mnt/s3fs/' + b?.bucket) : '',
                    };
                }).filter(x => !!x.mountPoint && !isNaN(x.bucketId));
            }
            else {
                transformMountpoints = [];
            }
        }

        let indMetadata: boolean | undefined;
        if (typeof params?.info?.indMetadata === 'boolean') {
            indMetadata = params.info.indMetadata;
        }
        else if (typeof selectedBlock?.indMetadata === 'boolean') {
            indMetadata = selectedBlock.indMetadata;
        }

        let cliArguments: string | undefined;
        if (typeof params?.info?.cliArguments === 'string') {
            cliArguments = params.info.cliArguments;
        }
        else if (typeof selectedBlock?.cliArguments === 'string') {
            cliArguments = selectedBlock.cliArguments;
        }

        let allowExtraCliArguments: boolean | undefined;
        if (typeof params?.info?.allowExtraCliArguments === 'boolean') {
            allowExtraCliArguments = params.info.allowExtraCliArguments;
        }
        else if (typeof selectedBlock?.allowExtraCliArguments === 'boolean') {
            allowExtraCliArguments = selectedBlock.allowExtraCliArguments;
        }

        let showInDataSources: boolean | undefined;
        if (typeof params?.info?.showInDataSources === 'boolean') {
            showInDataSources = params.info.showInDataSources;
        }
        else if (typeof selectedBlock?.showInDataSources === 'boolean') {
            showInDataSources = selectedBlock.showInDataSources;
        }

        let showInCreateTransformationJob: boolean | undefined;
        if (typeof params?.info?.showInCreateTransformationJob === 'boolean') {
            showInCreateTransformationJob = params.info.showInCreateTransformationJob;
        }
        else if (typeof selectedBlock?.showInCreateTransformationJob === 'boolean') {
            showInCreateTransformationJob = selectedBlock.showInCreateTransformationJob;
        }

        if (!params) {
            params = {
                version: 1,
                type: 'transform',
                info: {
                    name: blockName,
                    description: blockDescription,
                    operatesOn: blockOperatesOn,
                    transformMountpoints: transformMountpoints,
                    allowExtraCliArguments: allowExtraCliArguments,
                    cliArguments: cliArguments,
                    indMetadata: indMetadata,
                    showInCreateTransformationJob: showInCreateTransformationJob,
                    showInDataSources: showInDataSources,
                },
                parameters: [],
            };
        }
        else {
            params.info.name = blockName;
            params.info.description = blockDescription;
            params.info.operatesOn = blockOperatesOn;
            params.info.transformMountpoints = transformMountpoints;
            params.info.allowExtraCliArguments = allowExtraCliArguments;
            params.info.cliArguments = cliArguments;
            params.info.indMetadata = indMetadata;
            params.info.showInCreateTransformationJob = showInCreateTransformationJob;
            params.info.showInDataSources = showInDataSources;
        }

        await this._blockConfigManager.saveParameters(params);

        await this._blockConfigManager.saveConfig({
            organizationId: organizationId,
            id: selectedBlock ? selectedBlock.id : undefined,
        });
    }

    private async createOrUpdate(existingBlocks: { }[]) {
        return existingBlocks.length > 0 ? <'create' | 'update'>(await inquirer.prompt([{
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
    }

    private async selectExistingBlock<T extends { id: number, name: string }>(existingBlocks: T[]) {
        // Update an existing block
        // Choose a block ID
        let blockChoiceInqRes = await inquirer.prompt([{
            type: 'list',
            choices: existingBlocks,
            name: 'id',
            message: 'Choose a block to update',
            pageSize: 20
        }]);
        const ret = existingBlocks.find(block => block.name === blockChoiceInqRes.id);
        if (!ret) {
            throw new Error('selectExistingBlock failed to find "' + blockChoiceInqRes.id + '"');
        }
        return ret;
    }
}
