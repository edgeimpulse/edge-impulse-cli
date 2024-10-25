import * as models from  '../../sdk/studio/sdk/model/models';
import { EdgeImpulseConfig } from '../config';
import Path from 'path';
import fs from 'fs';
import { pathExists } from './blocks-helper';
import inquirer from 'inquirer';
import {
    AIActionBlockParametersJson,
    DeployBlockParametersJson, DSPBlockParametersJson,
    MachineLearningBlockParametersJson, ParametersJsonType,
    SyntheticDataBlockParametersJson, TransformBlockParametersJson
} from './parameter-types';
import { BlockConfigItemV2, BlockConfigV2, DSPParameterItem } from '../../shared/parameters-json-types';

/**
 * Before #11478 we stored block options, like the block name, or specific options
 * like what data type a transformation block operates on (folder, file, standalone)
 * in the .ei-block-config. This was quite annoying as the .ei-block-config also contains
 * environment specific information, like the organization ID and the block ID that the
 * block is tied to - so you cannot commit this file in public repos.
 * Configs that use this pattern are v0 and v1.
 *
 * In #11478 we changed this so only the block ID and organization ID are stored in the
 * .ei-block-config; and any block options (like name and what they operate on) are moved
 * to a parameters.json file. Configs that use this pattern are v2+.
 *
 * v0 and v1 differ because v1 allows multiple environments in one config file. E.g.:
 * {
 *      "edgeimpulse.com": {
 *          "blockId": 3
 *      },
 *      "localhost": {
 *          "blockId": 4
 *      }
 * }
 * (very useful when developing as an EI employee)
 *
 * This file handles loading v0, v1 and v2 config files. v0 and v1 will automatically
 * be converted into v2, by moving any block options into a parameters.json file
 * (after user confirmation).
 *
 * Before #11478 ML and Transform jobs used a parameters.json file for parameters that
 * needed to be rendered in the UI. Here the content of the file was just an array of
 * DSPParameterItem[] items. If we see a v0/v1 block with an old parameters.json file
 * we convert this parameters.json in a proper versioned file and merge in the block options,
 * the full spec is e.g. in MachineLearningBlockParametersJson (and similar ones).
 */

type BlockConfigV0 = BlockConfigItemV1 & {
    version: undefined,
};

type BlockConfigV1 = {
    version: 1,
    config: {
        [host: string]: BlockConfigItemV1,
    }
};

type BlockConfigItemV1 = {
    name: string;
    description: string;
    id?: number;
    organizationId: number;
    type: models.UploadCustomBlockRequestTypeEnum;
} & ({
    type: 'transform';
    operatesOn: 'file' | 'directory' | 'standalone' | undefined;
    transformMountpoints: {
        bucketId: number;
        mountPoint: string;
    }[] | undefined;
} | {
    type: 'transferLearning';
    tlOperatesOn?: models.OrganizationTransferLearningOperatesOn;
    tlObjectDetectionLastLayer?: models.ObjectDetectionLastLayer;
    tlImageInputScaling?: models.ImageInputScaling;
    tlIndRequiresGpu?: boolean,
    repositoryUrl?: string;
    tlCustomModelVariants?: models.OrganizationTransferLearningBlockCustomVariant[];
} | {
    type: 'deploy';
    deployCategory?: 'library' | 'firmware';
} | {
    type: 'dsp';
    port?: number;
});

export type BlockConfig = {
    type: 'dsp',
    config: BlockConfigItemV2 | null,
    parameters: DSPBlockParametersJson,
} | {
    type: 'deploy',
    config: BlockConfigItemV2 | null,
    parameters: DeployBlockParametersJson,
} | {
    type: 'machine-learning',
    config: BlockConfigItemV2 | null,
    parameters: MachineLearningBlockParametersJson,
} | {
    type: 'transform',
    config: BlockConfigItemV2 | null,
    parameters: TransformBlockParametersJson,
} | {
    type: 'synthetic-data',
    config: BlockConfigItemV2 | null,
    parameters: SyntheticDataBlockParametersJson,
} | {
    type: 'ai-action',
    config: BlockConfigItemV2 | null,
    parameters: AIActionBlockParametersJson,
};

export class BlockConfigManager {
    private _config: EdgeImpulseConfig;
    private _folder: string;
    private _paths: {
        eiBlockConfig: string,
        parametersJson: string,
    };
    private _skipConfirmation: boolean;
    private _transformWhatTypeOfBlockIsThisReply?: 'synthetic-data' | 'transform' | 'ai-actions';

    constructor(config: EdgeImpulseConfig, folder: string, opts?: {
        skipConfirmation?: boolean,
        transformWhatTypeOfBlockIsThisReply?: 'synthetic-data' | 'transform' | 'ai-actions',
    }) {
        this._config = config;
        this._folder = folder;
        this._paths = {
            eiBlockConfig: Path.join(folder, '.ei-block-config'),
            parametersJson: Path.join(folder, 'parameters.json'),
        };
        this._skipConfirmation = opts?.skipConfirmation || false;
        this._transformWhatTypeOfBlockIsThisReply = opts?.transformWhatTypeOfBlockIsThisReply;
    }

    async loadConfig(opts: {
        throwOnMissingParams: boolean,
        clean?: boolean,
    }): Promise<BlockConfig | null> {
        try {
            let loadedConfig = await pathExists(this._paths.eiBlockConfig) ?
                <BlockConfigV0 | BlockConfigV1 | BlockConfigV2>JSON.parse(
                    await fs.promises.readFile(this._paths.eiBlockConfig, 'utf-8')
                ) : undefined;

            if (loadedConfig) {
                if (typeof loadedConfig.version === 'undefined') {
                    loadedConfig = await this.migrateV0ToV2(loadedConfig);
                    await fs.promises.writeFile(this._paths.eiBlockConfig, JSON.stringify(loadedConfig, null, 4), 'utf-8');

                    if (!this._skipConfirmation) {
                        console.log(`✓ Migrated configuration`);
                        console.log(``);
                    }
                }

                if (loadedConfig.version === 1) {
                    loadedConfig = await this.migrateV1ToV2(loadedConfig);
                    await fs.promises.writeFile(this._paths.eiBlockConfig, JSON.stringify(loadedConfig, null, 4), 'utf-8');

                    if (!this._skipConfirmation) {
                        console.log(`✓ Migrated configuration`);
                        console.log(``);
                    }
                }

                if (loadedConfig.version !== 2) {
                    throw new Error(`Config version is ${(<{ version: number }>loadedConfig).version} (expected 1 or 2). ` +
                        `Delete the .ei-block-config file to reset the block.`);
                }
            }

            let config: BlockConfigItemV2 | null;
            if (opts.clean) {
                config = null;
            }
            else {
                config = loadedConfig ?
                    loadedConfig.config[this._config.host] || null :
                    null;
            }

            if (!await pathExists(this._paths.parametersJson)) {
                if (opts.throwOnMissingParams) {
                    throw new Error(`Missing "parameters.json", one is required for all blocks`);
                }
                return null;
            }
            let parameters = <ParametersJsonType>JSON.parse(await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
            if (!parameters.type) {
                if ((<{ info: any }>parameters).info) {
                    // DSP Block
                    parameters = {
                        version: 1,
                        type: 'dsp',
                        info: (<DSPBlockParametersJson>parameters).info,
                        parameters: (<DSPBlockParametersJson>parameters).parameters,
                    };
                    await this.saveParameters(parameters);
                }
                else if (Array.isArray(parameters)) {
                    return null;
                }
            }

            switch (parameters.type) {
                case 'dsp': {
                    if (parameters.version !== 1) {
                        throw new Error(`Unexpected value for "version" in "parameters.json" (expected 1)`);
                    }
                    return {
                        type: 'dsp',
                        config: config,
                        parameters: parameters,
                    };
                }
                case 'deploy': {
                    if (parameters.version !== 1) {
                        throw new Error(`Unexpected value for "version" in "parameters.json" (expected 1)`);
                    }
                    return {
                        type: 'deploy',
                        config: config,
                        parameters: parameters,
                    };
                }
                case 'machine-learning': {
                    if (parameters.version !== 1) {
                        throw new Error(`Unexpected value for "version" in "parameters.json" (expected 1)`);
                    }
                    return {
                        type: 'machine-learning',
                        config: config,
                        parameters: parameters,
                    };
                }
                case 'transform': {
                    if (parameters.version !== 1) {
                        throw new Error(`Unexpected value for "version" in "parameters.json" (expected 1)`);
                    }
                    return {
                        type: 'transform',
                        config: config,
                        parameters: parameters,
                    };
                }
                case 'synthetic-data': {
                    if (parameters.version !== 1) {
                        throw new Error(`Unexpected value for "version" in "parameters.json" (expected 1)`);
                    }
                    return {
                        type: 'synthetic-data',
                        config: config,
                        parameters: parameters,
                    };
                }
                case 'ai-action': {
                    if (parameters.version !== 1) {
                        throw new Error(`Unexpected value for "version" in "parameters.json" (expected 1)`);
                    }
                    return {
                        type: 'ai-action',
                        config: config,
                        parameters: parameters,
                    };
                }
                default:
                    throw new Error(`Unhandled value for "type" in "parameters.json" (${(<{ type: string }>parameters).type})`);
            }
        }
        catch (ex2) {
            let ex = <Error>ex2;
            throw new Error('Failed to load config from .ei-block-config: ' +
                (ex.message || ex.toString()));
        }
    }

    async saveConfig(config: BlockConfigItemV2) {
        let currConfig: BlockConfigV2;
        if (await pathExists(this._paths.eiBlockConfig)) {
            try {
                let loadedConfig = <BlockConfigV2>JSON.parse(
                    await fs.promises.readFile(this._paths.eiBlockConfig, 'utf-8')
                );
                if (loadedConfig.version !== 2) {
                    throw new Error(`Config version is ${loadedConfig.version} (expected 2). ` +
                        'This file should have been auto-converted already when calling "BlockConfigManager:saveConfig".');
                }
                currConfig = loadedConfig;
            }
            catch (ex2) {
                let ex = <Error>ex2;
                throw new Error('Failed to load config from .ei-block-config: ' +
                    (ex.message || ex.toString()));
            }
        }
        else {
            currConfig = {
                version: 2,
                config: { },
            };
        }

        currConfig.config[this._config.host] = config;
        await fs.promises.writeFile(this._paths.eiBlockConfig, JSON.stringify(currConfig, null, 4), 'utf-8');
    }

    async saveParameters(parameters: ParametersJsonType) {
        await fs.promises.writeFile(this._paths.parametersJson, JSON.stringify(parameters, null, 4), 'utf-8');
    }

    /**
     * Migrate v0 config to v1 to v2, see top of this file for an explanation.
     */
    private async migrateV0ToV2(config: BlockConfigV0): Promise<BlockConfigV2> {
        let v1Config: BlockConfigV1 = {
            version: 1,
            config: { },
        };
        v1Config.config[this._config.host] = config;
        return await this.migrateV1ToV2(v1Config);
    }

    /**
     * Migrate v1 to v2, see top of this file for an explanation.
     */
    private async migrateV1ToV2(config: BlockConfigV1): Promise<BlockConfigV2> {
        if (!this._skipConfirmation) {
            const continueRes = await inquirer.prompt({
                type: 'confirm',
                name: 'continue',
                message: `We're moving some of your block configuration from .ei-block-config to parameters.json. ` +
                    `Continuing will update both files. Continue?`
            });

            if (!continueRes.continue) {
                throw new Error(`Aborting`);
            }
        }

        let overwroteHost = false;

        // do we have an item for this host? use that. otherwise pick the first one.
        let blockConfigItem: BlockConfigItemV1;
        if (config.config[this._config.host]) {
            blockConfigItem = config.config[this._config.host];
        }
        else if (Object.keys(config.config).length > 0) {
            blockConfigItem = config.config[Object.keys(config.config)[0]];
            overwroteHost = true;
        }
        else {
            // no items to be found... so just create the new config
            const newConfig: BlockConfigV2 = {
                version: 2,
                config: { }
            };
            return newConfig;
        }

        if (blockConfigItem.type === 'dsp') {
            // We're not fetching the remote DSP block here (like we do for all other block types)
            // because there are no properties that are missing in v1 compared to v2
            // (so we can get all of them from the .ei-block-config)

            if (await pathExists(this._paths.parametersJson)) {
                let parameters = <DSPBlockParametersJson>JSON.parse(await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
                if (parameters.version !== 1 || parameters.type !== 'dsp') {
                    parameters = {
                        version: 1,
                        type: 'dsp',
                        info: parameters.info,
                        parameters: parameters.parameters,
                    };
                }
                if (parameters.info && typeof parameters.info.port === 'undefined') {
                    parameters.info.port = blockConfigItem.port;
                }
                await this.saveParameters(parameters);
            }
            else {
                throw new Error(`You're missing a "parameters.json" file, this is required for DSP blocks. ` +
                    `Add it and re-run this command.`);
            }

            const newConfig: BlockConfigV2 = {
                version: 2,
                config: { }
            };
            for (let k of Object.keys(config.config)) {
                const oldConfig = config.config[k];
                newConfig.config[k] = {
                    organizationId: oldConfig.organizationId,
                    id: oldConfig.id,
                };
                if (typeof newConfig.config[k].id === 'undefined') {
                    delete newConfig.config[k].id;
                }
            }

            return newConfig;
        }
        else if (blockConfigItem.type === 'deploy') {
            if (await pathExists(this._paths.parametersJson)) {
                let parameters = <DeployBlockParametersJson>JSON.parse(
                    await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
                if (parameters.version !== 1 || parameters.type !== 'deploy') {
                    parameters = {
                        version: 1,
                        type: 'deploy',
                        info: parameters.info || { },
                    };
                }
                parameters.info = parameters.info || { };
                if (typeof parameters.info.name === 'undefined') {
                    parameters.info.name = blockConfigItem.name;
                }
                if (typeof parameters.info.description === 'undefined') {
                    parameters.info.description = blockConfigItem.description;
                }
                if (typeof parameters.info.category === 'undefined') {
                    parameters.info.category = blockConfigItem.deployCategory;
                }
                await this.saveParameters(parameters);
            }
            else {
                let parameters: DeployBlockParametersJson;

                if (blockConfigItem.id && !overwroteHost) {
                    try {
                        // the v1 config format was missing a ton of properties that could be configured
                        // on the deploy block. Rather than prompt the user for them we'll fetch the
                        // remote block and copy the properties from EI => parameters.json, so you can
                        // commit the full configured block.
                        const block = await this._config.api.organizationBlocks.getOrganizationDeployBlock(
                            blockConfigItem.organizationId, blockConfigItem.id);
                        parameters = {
                            version: 1,
                            type: 'deploy',
                            info: {
                                name: blockConfigItem.name || block.deployBlock.name,
                                description: blockConfigItem.description || block.deployBlock.description,
                                category: blockConfigItem.deployCategory,
                                cliArguments: block.deployBlock.cliArguments,
                                mountLearnBlock: block.deployBlock.mountLearnBlock,
                                showOptimizations: block.deployBlock.showOptimizations,
                                supportsEonCompiler: block.deployBlock.supportsEonCompiler,
                                integrateUrl: block.deployBlock.integrateUrl,
                                privileged: block.deployBlock.privileged,
                            },
                        };
                    }
                    catch (ex2) {
                        let ex = <Error>ex2;
                        throw new Error(`Failed to get deploy block with ID ${blockConfigItem.id}: ` +
                            `${ex.message || ex.toString()}. Does this block still exist? If not, re-init the block ` +
                            `via "edge-impulse-blocks init --clean"`);
                    }
                }

                else {
                    parameters = {
                        version: 1,
                        type: 'deploy',
                        info: {
                            name: blockConfigItem.name,
                            description: blockConfigItem.description,
                            category: blockConfigItem.deployCategory || 'firmware',
                            cliArguments: '',
                            mountLearnBlock: false,
                            showOptimizations: true,
                            supportsEonCompiler: true,
                        },
                    };
                }
                await this.saveParameters(parameters);
            }

            const newConfig: BlockConfigV2 = {
                version: 2,
                config: { }
            };
            for (let k of Object.keys(config.config)) {
                const oldConfig = config.config[k];
                newConfig.config[k] = {
                    organizationId: oldConfig.organizationId,
                    id: oldConfig.id,
                };
                if (typeof newConfig.config[k].id === 'undefined') {
                    delete newConfig.config[k].id;
                }
            }

            return newConfig;
        }
        else if (blockConfigItem.type === 'transferLearning') {
            let currBlock: models.OrganizationTransferLearningBlock | undefined;

            if (blockConfigItem.id && !overwroteHost) {
                try {
                    // the v1 config format was missing a few properties that could be configured
                    // on the ML block. Rather than prompt the user for them we'll fetch the
                    // remote block and copy the properties from EI => parameters.json, so you can
                    // commit the full configured block.
                    currBlock = (await this._config.api.organizationBlocks.getOrganizationTransferLearningBlock(
                        blockConfigItem.organizationId, blockConfigItem.id)).transferLearningBlock;
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    throw new Error(`Failed to get ML block with ID ${blockConfigItem.id}: ` +
                        `${ex.message || ex.toString()}. Does this block still exist? If not, re-init the block ` +
                        `via "edge-impulse-blocks init --clean"`);
                }
            }

            if (await pathExists(this._paths.parametersJson)) {
                let parameters = <MachineLearningBlockParametersJson>JSON.parse(await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
                if (Array.isArray(parameters)) {
                    // old param file
                    let oldParams: DSPParameterItem[] = <DSPParameterItem[]>parameters;
                    parameters = {
                        version: 1,
                        type: 'machine-learning',
                        info: {
                            name: blockConfigItem.name,
                            description: blockConfigItem.description,
                            operatesOn: blockConfigItem.tlOperatesOn || currBlock?.operatesOn,
                            objectDetectionLastLayer: blockConfigItem.tlObjectDetectionLastLayer ||
                                currBlock?.objectDetectionLastLayer,
                            imageInputScaling: blockConfigItem.tlImageInputScaling || currBlock?.imageInputScaling,
                            customModelVariants: blockConfigItem.tlCustomModelVariants ||
                                currBlock?.customModelVariants,
                            indRequiresGpu: typeof blockConfigItem.tlIndRequiresGpu === 'boolean' ?
                                blockConfigItem.tlIndRequiresGpu :
                                currBlock?.indRequiresGpu,
                            repositoryUrl: blockConfigItem.repositoryUrl || currBlock?.repositoryUrl,
                            displayCategory: currBlock?.displayCategory,
                        },
                        parameters: oldParams,
                    };
                    await this.saveParameters(parameters);
                }
                else {
                    // new format... just leave it as-is
                }
            }
            else {
                let parameters: MachineLearningBlockParametersJson = {
                    version: 1,
                    type: 'machine-learning',
                    info: {
                        name: blockConfigItem.name,
                        description: blockConfigItem.description,
                        operatesOn: blockConfigItem.tlOperatesOn || currBlock?.operatesOn,
                        objectDetectionLastLayer: blockConfigItem.tlObjectDetectionLastLayer ||
                            currBlock?.objectDetectionLastLayer,
                        imageInputScaling: blockConfigItem.tlImageInputScaling || currBlock?.imageInputScaling,
                        customModelVariants: blockConfigItem.tlCustomModelVariants ||
                            currBlock?.customModelVariants,
                        indRequiresGpu: typeof blockConfigItem.tlIndRequiresGpu === 'boolean' ?
                            blockConfigItem.tlIndRequiresGpu :
                            currBlock?.indRequiresGpu,
                        repositoryUrl: blockConfigItem.repositoryUrl || currBlock?.repositoryUrl,
                        displayCategory: currBlock?.displayCategory,

                    },
                    parameters: [],
                };
                await this.saveParameters(parameters);
            }

            const newConfig: BlockConfigV2 = {
                version: 2,
                config: { }
            };
            for (let k of Object.keys(config.config)) {
                const oldConfig = config.config[k];
                newConfig.config[k] = {
                    organizationId: oldConfig.organizationId,
                    id: oldConfig.id,
                };
                if (typeof newConfig.config[k].id === 'undefined') {
                    delete newConfig.config[k].id;
                }
            }

            return newConfig;
        }
        else if (blockConfigItem.type === 'transform') {
            let blockType: 'transform' | 'synthetic-data' | 'ai-actions';
            let currBlock: models.OrganizationTransformationBlock | undefined;

            if (blockConfigItem.id && !overwroteHost) {
                try {
                    // the v1 config format was missing a ton of properties that could be configured
                    // on the transform block. Rather than prompt the user for them we'll fetch the
                    // remote block and copy the properties from EI => parameters.json, so you can
                    // commit the full configured block.
                    currBlock = (await this._config.api.organizationBlocks.getOrganizationTransformationBlock(
                        blockConfigItem.organizationId, blockConfigItem.id)).transformationBlock;
                    if (currBlock.showInSyntheticData) {
                        blockType = 'synthetic-data';
                    }
                    else if (currBlock.showInAIActions) {
                        blockType = 'ai-actions';
                    }
                    else {
                        blockType = 'transform';
                    }
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    throw new Error(`Failed to get transformation block with ID ${blockConfigItem.id}: ` +
                        `${ex.message || ex.toString()}. Does this block still exist? If not, re-init the block ` +
                        `via "edge-impulse-blocks init --clean"`);
                }
            }
            else {
                if (this._transformWhatTypeOfBlockIsThisReply) {
                    blockType = this._transformWhatTypeOfBlockIsThisReply;
                }
                else {
                    let blockList =
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
                                name: 'AI actions block',
                                value: 'ai-actions'
                            },
                        ];

                    // Select the type of block
                    let blockTypeInqRes = await inquirer.prompt([{
                        type: 'list',
                        choices: blockList,
                        name: 'type',
                        message: 'What type of block is this?',
                        pageSize: 20
                    }]);
                    blockType = <'transform' | 'synthetic-data' | 'ai-actions'>blockTypeInqRes.type;
                }
            }

            const requiredEnvVariables = (currBlock?.environmentVariables || []).length > 0 ?
                (currBlock?.environmentVariables || []).map(x => x.key) :
                undefined;

            if (blockType === 'synthetic-data') {
                if (await pathExists(this._paths.parametersJson)) {
                    let parameters = <SyntheticDataBlockParametersJson>JSON.parse(await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
                    if (Array.isArray(parameters)) {
                        // old param file
                        let oldParams: DSPParameterItem[] = <DSPParameterItem[]>parameters;
                        parameters = {
                            version: 1,
                            type: 'synthetic-data',
                            info: {
                                name: blockConfigItem.name,
                                description: blockConfigItem.description,
                                requiredEnvVariables: requiredEnvVariables,
                            },
                            parameters: oldParams,
                        };
                        await this.saveParameters(parameters);
                    }
                    else {
                        // new format... just leave it as-is
                    }
                }
                else {
                    let parameters: SyntheticDataBlockParametersJson = {
                        version: 1,
                        type: 'synthetic-data',
                        info: {
                            name: blockConfigItem.name,
                            description: blockConfigItem.description,
                            requiredEnvVariables: requiredEnvVariables,
                        },
                        parameters: [],
                    };
                    await this.saveParameters(parameters);
                }
            }
            else if (blockType === 'ai-actions') {
                if (await pathExists(this._paths.parametersJson)) {
                    let parameters = <AIActionBlockParametersJson>JSON.parse(await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
                    if (Array.isArray(parameters)) {
                        // old param file
                        let oldParams: DSPParameterItem[] = <DSPParameterItem[]>parameters;
                        parameters = {
                            version: 1,
                            type: 'ai-action',
                            info: {
                                name: blockConfigItem.name,
                                description: blockConfigItem.description,
                                requiredEnvVariables: requiredEnvVariables,
                            },
                            parameters: oldParams,
                        };
                        await this.saveParameters(parameters);
                    }
                    else {
                        // new format... just leave it as-is
                    }
                }
                else {
                    let parameters: AIActionBlockParametersJson = {
                        version: 1,
                        type: 'ai-action',
                        info: {
                            name: blockConfigItem.name,
                            description: blockConfigItem.description,
                            requiredEnvVariables: requiredEnvVariables,
                        },
                        parameters: [],
                    };
                    await this.saveParameters(parameters);
                }
            }
            else {
                if (await pathExists(this._paths.parametersJson)) {
                    let parameters = <TransformBlockParametersJson>JSON.parse(await fs.promises.readFile(this._paths.parametersJson, 'utf-8'));
                    if (Array.isArray(parameters)) {
                        // old param file
                        let oldParams: DSPParameterItem[] = <DSPParameterItem[]>parameters;
                        parameters = {
                            version: 1,
                            type: 'transform',
                            info: {
                                name: blockConfigItem.name,
                                description: blockConfigItem.description,
                                operatesOn: blockConfigItem.operatesOn,
                                transformMountpoints: blockConfigItem.transformMountpoints,
                                allowExtraCliArguments: currBlock?.allowExtraCliArguments,
                                cliArguments: currBlock?.cliArguments,
                                indMetadata: currBlock?.indMetadata,
                                showInCreateTransformationJob: currBlock?.showInCreateTransformationJob,
                                showInDataSources: currBlock?.showInDataSources,
                                requiredEnvVariables: requiredEnvVariables,
                            },
                            parameters: oldParams,
                        };
                        await this.saveParameters(parameters);
                    }
                }
                else {
                    let parameters: TransformBlockParametersJson = {
                        version: 1,
                        type: 'transform',
                        info: {
                            name: blockConfigItem.name,
                            description: blockConfigItem.description,
                            operatesOn: blockConfigItem.operatesOn,
                            transformMountpoints: blockConfigItem.transformMountpoints,
                            allowExtraCliArguments: currBlock?.allowExtraCliArguments,
                            cliArguments: currBlock?.cliArguments,
                            indMetadata: currBlock?.indMetadata,
                            showInCreateTransformationJob: currBlock?.showInCreateTransformationJob,
                            showInDataSources: currBlock?.showInDataSources,
                            requiredEnvVariables: requiredEnvVariables,
                        },
                        parameters: [],
                    };
                    await this.saveParameters(parameters);
                }
            }

            const newConfig: BlockConfigV2 = {
                version: 2,
                config: { }
            };
            for (let k of Object.keys(config.config)) {
                const oldConfig = config.config[k];
                newConfig.config[k] = {
                    organizationId: oldConfig.organizationId,
                    id: oldConfig.id,
                };
                if (typeof newConfig.config[k].id === 'undefined') {
                    delete newConfig.config[k].id;
                }
            }

            return newConfig;
        }
        else {
            throw new Error(`BlockConfigManager:migrateV1ToV2 failed to handle "${(<{ type: string }>blockConfigItem).type}"`);
        }
    }
}
