import * as models from  '../../sdk/studio/sdk/model/models';
import { DSPParameterItem, DSPParameterResponse, DSPParameters } from "../../shared/parameters-json-types";

export type DSPBlockParametersJson = {
    version: 1,
    type: 'dsp',
} & DSPParameterResponse;

export type DeployBlockParametersJson = {
    version: 1,
    type: 'deploy',
    info: {
        name: string,
        description: string,
        category?: 'library' | 'firmware',
        integrateUrl?: string,
        cliArguments: string,
        supportsEonCompiler: boolean,
        mountLearnBlock: boolean,
        showOptimizations: boolean,
        privileged?: boolean,
    },
};

export type MachineLearningBlockParametersJson = {
    version: 1,
    type: 'machine-learning',
    info: {
        name: string,
        description: string,
        operatesOn?: models.OrganizationTransferLearningOperatesOn;
        objectDetectionLastLayer?: models.ObjectDetectionLastLayer;
        imageInputScaling?: models.ImageInputScaling;
        indRequiresGpu?: boolean,
        repositoryUrl?: string;
        customModelVariants?: models.OrganizationTransferLearningBlockCustomVariant[];
        displayCategory?: models.BlockDisplayCategory;
    },
    parameters: DSPParameterItem[];
};

export type SyntheticDataBlockParametersJson = {
    version: 1,
    type: 'synthetic-data',
    info: {
        name: string,
        description: string,
        requiredEnvVariables: string[] | undefined;
    },
    parameters: DSPParameterItem[];
};

export type AIActionBlockParametersJson = {
    version: 1,
    type: 'ai-action',
    info: {
        name: string,
        description: string,
        requiredEnvVariables: string[] | undefined;
        operatesOn: models.AIActionsOperatesOn[] | undefined;
    },
    parameters: DSPParameterItem[];
};

export type TransformBlockParametersJson = {
    version: 1,
    type: 'transform',
    info: {
        name: string,
        description: string,
        operatesOn: 'file' | 'directory' | 'standalone' | undefined;
        transformMountpoints: {
            bucketId: number;
            mountPoint: string;
        }[] | undefined;
        indMetadata: boolean | undefined;
        cliArguments: string | undefined;
        allowExtraCliArguments: boolean | undefined;
        showInDataSources: boolean | undefined;
        showInCreateTransformationJob: boolean | undefined;
        requiredEnvVariables: string[] | undefined;
    },
    parameters: DSPParameterItem[];
};

export type ParametersJsonType = DSPBlockParametersJson | DeployBlockParametersJson |
    MachineLearningBlockParametersJson | SyntheticDataBlockParametersJson |
    TransformBlockParametersJson | AIActionBlockParametersJson;
