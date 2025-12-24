/* eslint @typescript-eslint/no-unsafe-assignment: 0 */

import { AIActionBlockParametersJson, DeployBlockParametersJson, DSPBlockParametersJson,
    MachineLearningBlockParametersJson, SyntheticDataBlockParametersJson,
    TransformBlockParametersJson } from "./parameter-types";
import * as models from  '../../sdk/studio/sdk/model/models';
import { EdgeImpulseConfig } from '../../cli-common/config';
import { updateOrganizationDeployBlockFormParams } from "../../sdk/studio/sdk/api";

// Here's some crazy TypeScript magic to turn e.g.
// { name?: string, age: number } into { name: string | undefined, age: number }
// we can use this in blocks.ts to ensure that when a new field is added to
// models.CreateXXXBlock, we need to explicitly set it to e.g. undefined,
// even when it's an optional property (so we don't forget to update the CLI
// when the types change).
type AddUndefined<T> = {
    [K in keyof T]-?: T[K] | undefined;
};
type OptionalKeys<T> = {
    [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];
type PickOptional<T> = Pick<T, OptionalKeys<T>>;
type NonOptionalKeys<T> = {
    [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];
type PickNonOptional<T> = Pick<T, NonOptionalKeys<T>>;
export type TurnOptionalIntoOrUndefined<T> = AddUndefined<Required<PickOptional<T>>> &
    PickNonOptional<T>;


/**
 * This file diffs a remote block w/ local parameters.json. It's called from blocks.ts
 * to prompt the user to confirm updating a block if any parameters have changed.
 * It's using some TypeScript type magic to ensure that all properties in parameters.json
 * are properly checked.
 */

export class UpdateRemoteBlockFromParamsJson {
    private _config: EdgeImpulseConfig;

    constructor(config: EdgeImpulseConfig) {
        this._config = config;
    }

    // Begin transform blocks
    async getDiffedPropertiesForTransformBlock(
        organizationId: number,
        blockId: number,
        params: TransformBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationTransformationBlock(
            organizationId, blockId)).transformationBlock;
        const diffCheck = this.transformBlockDiffCheck(params, remoteBlock);
        return this.getDiffedProperties(diffCheck);
    }

    async updateTransformBlock(
        organizationId: number,
        blockId: number,
        params: TransformBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationTransformationBlock(
            organizationId, blockId)).transformationBlock;
        const diffCheck = this.transformBlockDiffCheck(params, remoteBlock);
        const { shouldUpdate, updateObj } =
            this.getUpdatedObject<models.UpdateOrganizationTransformationBlockRequest>(diffCheck, { });

        if (shouldUpdate) {
            await this._config.api.organizationBlocks.updateOrganizationTransformationBlock(
                organizationId, blockId, updateObj);
        }
        return diffCheck;
    }

    private transformBlockDiffCheck(
        params: TransformBlockParametersJson,
        remoteBlock: models.OrganizationTransformationBlock,
    ) {
        // If you get a type error here, it means that a new field was added to the update request
        // and you need to update the parameters json spec (or ignore the field) here.
        type TL = Exclude<keyof models.UpdateOrganizationTransformationBlockRequest,
            'name' |
            'dockerContainer' |
            'description' |
            'requestsCpu' |
            'requestsMemory' |
            'limitsCpu' |
            'limitsMemory' |
            'additionalMountPoints' |
            'parameters' |
            'maxRunningTimeStr' |
            'isPublic' |
            'repositoryUrl' |
            'showInSyntheticData' |
            'showInAIActions' |
            'environmentVariables' |
            'aiActionsOperatesOn' |
            'sourceCodeDownloadStaffOnly'
        >;
        let diffCheck: { [K in TL]: { oldVal: any, newVal: any } } = {
            operatesOn: { oldVal: remoteBlock.operatesOn, newVal: params.info.operatesOn },
            indMetadata: { oldVal: remoteBlock.indMetadata, newVal: params.info.indMetadata },
            cliArguments: { oldVal: remoteBlock.cliArguments, newVal: params.info.cliArguments },
            allowExtraCliArguments: {
                oldVal: remoteBlock.allowExtraCliArguments,
                newVal: params.info.allowExtraCliArguments
            },
            showInDataSources: {
                oldVal: remoteBlock.showInDataSources,
                newVal: params.info.showInDataSources
            },
            showInCreateTransformationJob: {
                oldVal: remoteBlock.showInCreateTransformationJob,
                newVal: params.info.showInCreateTransformationJob
            },
        };
        return <{ [k: string]: { oldVal: any, newVal: any } }>diffCheck;
    }
    // End transform blocks

    // Begin synthetic data blocks
    async getDiffedPropertiesForSyntheticDataBlock(
        organizationId: number,
        blockId: number,
        params: SyntheticDataBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationTransformationBlock(
            organizationId, blockId)).transformationBlock;
        const diffCheck = this.syntheticDataBlockDiffCheck(params, remoteBlock);
        return this.getDiffedProperties(diffCheck);
    }

    async updateSyntheticDataBlock(
        organizationId: number,
        blockId: number,
        params: SyntheticDataBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationTransformationBlock(
            organizationId, blockId)).transformationBlock;
        const diffCheck = this.syntheticDataBlockDiffCheck(params, remoteBlock);
        const { shouldUpdate, updateObj } =
            this.getUpdatedObject<models.UpdateOrganizationTransformationBlockRequest>(diffCheck, { });

        if (shouldUpdate) {
            await this._config.api.organizationBlocks.updateOrganizationTransformationBlock(
                organizationId, blockId, updateObj);
        }
        return diffCheck;
    }

    private syntheticDataBlockDiffCheck(
        params: SyntheticDataBlockParametersJson,
        remoteBlock: models.OrganizationTransformationBlock,
    ) {
        // If you get a type error here, it means that a new field was added to the update request
        // and you need to update the parameters json spec (or ignore the field) here.
        type TL = Exclude<keyof models.UpdateOrganizationTransformationBlockRequest,
            'name' |
            'dockerContainer' |
            'indMetadata' |
            'description' |
            'cliArguments' |
            'requestsCpu' |
            'requestsMemory' |
            'limitsCpu' |
            'limitsMemory' |
            'additionalMountPoints' |
            'allowExtraCliArguments' |
            'operatesOn' |
            'parameters' |
            'maxRunningTimeStr' |
            'isPublic' |
            'repositoryUrl' |
            'showInDataSources' |
            'showInCreateTransformationJob' |
            'showInAIActions' |
            'environmentVariables' |
            'aiActionsOperatesOn' |
            'sourceCodeDownloadStaffOnly'
        >;
        let diffCheck: { [K in TL]: { oldVal: any, newVal: any } } = {
            showInSyntheticData: { oldVal: remoteBlock.showInSyntheticData, newVal: true },
        };
        return <{ [k: string]: { oldVal: any, newVal: any } }>diffCheck;
    }
    // End synthetic data blocks

    // Begin AI Action block
    async getDiffedPropertiesForAIActionBlock(
        organizationId: number,
        blockId: number,
        params: AIActionBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationTransformationBlock(
            organizationId, blockId)).transformationBlock;
        const diffCheck = this.aiActionBlockDiffCheck(params, remoteBlock);
        return this.getDiffedProperties(diffCheck);
    }

    async updateAIActionBlock(
        organizationId: number,
        blockId: number,
        params: AIActionBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationTransformationBlock(
            organizationId, blockId)).transformationBlock;
        const diffCheck = this.aiActionBlockDiffCheck(params, remoteBlock);
        const { shouldUpdate, updateObj } =
            this.getUpdatedObject<models.UpdateOrganizationTransformationBlockRequest>(diffCheck, { });

        if (shouldUpdate) {
            await this._config.api.organizationBlocks.updateOrganizationTransformationBlock(
                organizationId, blockId, updateObj);
        }
        return diffCheck;
    }

    private aiActionBlockDiffCheck(
        params: AIActionBlockParametersJson,
        remoteBlock: models.OrganizationTransformationBlock,
    ) {
        // If you get a type error here, it means that a new field was added to the update request
        // and you need to update the parameters json spec (or ignore the field) here.
        type TL = Exclude<keyof models.UpdateOrganizationTransformationBlockRequest,
            'name' |
            'dockerContainer' |
            'indMetadata' |
            'description' |
            'cliArguments' |
            'requestsCpu' |
            'requestsMemory' |
            'limitsCpu' |
            'limitsMemory' |
            'additionalMountPoints' |
            'allowExtraCliArguments' |
            'operatesOn' |
            'parameters' |
            'maxRunningTimeStr' |
            'isPublic' |
            'repositoryUrl' |
            'showInDataSources' |
            'showInCreateTransformationJob' |
            'showInSyntheticData' |
            'environmentVariables' |
            'sourceCodeDownloadStaffOnly'
        >;
        let diffCheck: { [K in TL]: { oldVal: any, newVal: any } } = {
            showInAIActions: { oldVal: remoteBlock.showInAIActions, newVal: true },
            aiActionsOperatesOn: { oldVal: remoteBlock.aiActionsOperatesOn, newVal: params.info.operatesOn },
        };
        return <{ [k: string]: { oldVal: any, newVal: any } }>diffCheck;
    }
    // End synthetic data blocks

    // Begin ML blocks
    async getDiffedPropertiesForMLBlock(
        organizationId: number,
        blockId: number,
        params: MachineLearningBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationTransferLearningBlock(
            organizationId, blockId)).transferLearningBlock;
        const diffCheck = this.mlBlockDiffCheck(params, remoteBlock);
        return this.getDiffedProperties(diffCheck);
    }

    async updateMLBlock(
        organizationId: number,
        blockId: number,
        params: MachineLearningBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationTransferLearningBlock(
            organizationId, blockId)).transferLearningBlock;
        const diffCheck = this.mlBlockDiffCheck(params, remoteBlock);
        const { shouldUpdate, updateObj } =
            this.getUpdatedObject<models.UpdateOrganizationTransferLearningBlockRequest>(diffCheck, { });

        if (shouldUpdate) {
            await this._config.api.organizationBlocks.updateOrganizationTransferLearningBlock(
                organizationId, blockId, updateObj);
        }
        return diffCheck;
    }

    private mlBlockDiffCheck(
        params: MachineLearningBlockParametersJson,
        remoteBlock: models.OrganizationTransferLearningBlock,
    ) {
        // If you get a type error here, it means that a new field was added to the update request
        // and you need to update the parameters json spec (or ignore the field) here.
        type TL = Exclude<keyof models.UpdateOrganizationTransferLearningBlockRequest,
            'name' |
            'dockerContainer' |
            'description' |
            'implementationVersion' |
            'isPublic' |
            'isPublicForDevices' |
            'publicProjectTierAvailability' |
            'parameters' |
            'indBlockNoLongerAvailable' |
            'blockNoLongerAvailableReason' |
            'sourceCodeDownloadStaffOnly'
        >;
        let diffCheck: { [K in TL]: { oldVal: any, newVal: any } } = {
            operatesOn: { oldVal: remoteBlock.operatesOn, newVal: params.info.operatesOn },
            objectDetectionLastLayer: {
                oldVal: remoteBlock.objectDetectionLastLayer,
                newVal: params.info.objectDetectionLastLayer
            },
            imageInputScaling: { oldVal: remoteBlock.imageInputScaling, newVal: params.info.imageInputScaling },
            indRequiresGpu: { oldVal: remoteBlock.indRequiresGpu, newVal: params.info.indRequiresGpu },
            repositoryUrl: { oldVal: remoteBlock.repositoryUrl, newVal: params.info.repositoryUrl },
            customModelVariants: { oldVal: remoteBlock.customModelVariants, newVal: params.info.customModelVariants },
            displayCategory: { oldVal: remoteBlock.displayCategory, newVal: params.info.displayCategory },
        };
        return <{ [k: string]: { oldVal: any, newVal: any } }>diffCheck;
    }
    // End ML blocks

    // Begin DSP blocks
    async getDiffedPropertiesForDSPBlock(
        organizationId: number,
        blockId: number,
        params: DSPBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationDspBlock(
            organizationId, blockId)).dspBlock;
        const diffCheck = this.dspBlockDiffCheck(params, remoteBlock);
        return this.getDiffedProperties(diffCheck);
    }

    async updateDSPBlock(
        organizationId: number,
        blockId: number,
        params: DSPBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationDspBlock(
            organizationId, blockId)).dspBlock;
        const diffCheck = this.dspBlockDiffCheck(params, remoteBlock);
        const { shouldUpdate, updateObj } =
            this.getUpdatedObject<models.UpdateOrganizationDspBlockRequest>(diffCheck, { });

        if (shouldUpdate) {
            await this._config.api.organizationBlocks.updateOrganizationDspBlock(
                organizationId, blockId, updateObj);
        }
        return diffCheck;
    }

    private dspBlockDiffCheck(
        params: DSPBlockParametersJson,
        remoteBlock: models.OrganizationDspBlock,
    ) {
        // If you get a type error here, it means that a new field was added to the update request
        // and you need to update the parameters json spec (or ignore the field) here.
        type TL = Exclude<keyof models.UpdateOrganizationDspBlockRequest,
            'name' |
            'dockerContainer' |
            'description' |
            'requestsCpu' |
            'requestsMemory' |
            'limitsCpu' |
            'limitsMemory' |
            'sourceCodeDownloadStaffOnly'
        >;

        let diffCheck: { [K in TL]: { oldVal: any, newVal: any } } = {
            port: { oldVal: remoteBlock.port, newVal: params.info.port },
        };
        return <{ [k: string]: { oldVal: any, newVal: any } }>diffCheck;
    }
    // End DSP blocks

    // Begin Deploy blocks
    async getDiffedPropertiesForDeployBlock(
        organizationId: number,
        blockId: number,
        params: DeployBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationDeployBlock(
            organizationId, blockId)).deployBlock;
        const diffCheck = this.deployBlockDiffCheck(params, remoteBlock);
        return this.getDiffedProperties(diffCheck);
    }

    async updateDeployBlock(
        organizationId: number,
        blockId: number,
        params: DeployBlockParametersJson,
    ) {
        const remoteBlock = (await this._config.api.organizationBlocks.getOrganizationDeployBlock(
            organizationId, blockId)).deployBlock;
        const diffCheck = this.deployBlockDiffCheck(params, remoteBlock);
        const { shouldUpdate, updateObj } =
            this.getUpdatedObject<updateOrganizationDeployBlockFormParams>(diffCheck, { });

        if (shouldUpdate) {
            await this._config.api.organizationBlocks.updateOrganizationDeployBlock(
                organizationId, blockId, updateObj);
        }
        return diffCheck;
    }

    private deployBlockDiffCheck(
        params: DeployBlockParametersJson,
        remoteBlock: models.OrganizationDeployBlock,
    ) {
        // If you get a type error here, it means that a new field was added to the update request
        // and you need to update the parameters json spec (or ignore the field) here.
        type TL = Exclude<keyof models.UpdateOrganizationDeployBlockRequest,
            'name' |
            'dockerContainer' |
            'description' |
            'requestsCpu' |
            'requestsMemory' |
            'limitsCpu' |
            'limitsMemory' |
            'photo' |
            'sourceCodeDownloadStaffOnly' |
            'parameters'
        >;
        let diffCheck: { [K in TL]: { oldVal: any, newVal: any } } = {
            category: { oldVal: remoteBlock.category, newVal: params.info.category },
            integrateUrl: { oldVal: remoteBlock.integrateUrl, newVal: params.info.integrateUrl },
            cliArguments: { oldVal: remoteBlock.cliArguments, newVal: params.info.cliArguments },
            supportsEonCompiler: { oldVal: remoteBlock.supportsEonCompiler, newVal: params.info.supportsEonCompiler },
            mountLearnBlock: { oldVal: remoteBlock.mountLearnBlock, newVal: params.info.mountLearnBlock },
            showOptimizations: { oldVal: remoteBlock.showOptimizations, newVal: params.info.showOptimizations },
            privileged: { oldVal: remoteBlock.privileged, newVal: params.info.privileged },
        };
        return <{ [k: string]: { oldVal: any, newVal: any } }>diffCheck;
    }
    // End Deploy blocks

    private getDiffedProperties(diffCheck: { [k: string]: { oldVal: any, newVal: any } }) {
        let ret: { prop: string, oldVal: any, newVal: any }[] = [];

        for (const k of Object.keys(diffCheck)) {
            let { oldVal, newVal } = diffCheck[k];
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal) &&
                !(typeof oldVal !== 'undefined' && typeof newVal === 'undefined')) {
                ret.push({
                    prop: k,
                    oldVal: oldVal,
                    newVal: newVal,
                });
            }
        }

        return ret;
    }

    /**
     * Take in a models.OrganizationUpdateX object and fill it with properties
     * @param diffCheck
     * @param updateObj
     * @returns
     */
    private getUpdatedObject<T extends { [k: string]: any }>(
        diffCheck: { [k: string]: { oldVal: any, newVal: any } },
        updateObj: T
    ): { shouldUpdate: boolean, updateObj: T } {
        let shouldUpdate = false;

        for (const k of Object.keys(diffCheck)) {
            let { oldVal, newVal } = diffCheck[k];
            if (oldVal !== newVal && !(typeof oldVal !== 'undefined' && typeof newVal === 'undefined')) {
                (<{ [k: string ]: any }>updateObj)[k] = newVal;
                shouldUpdate = true;
            }
        }

        return { shouldUpdate, updateObj };
    }
}
