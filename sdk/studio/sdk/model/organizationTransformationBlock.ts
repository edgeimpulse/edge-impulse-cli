/**
 * Edge Impulse API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { CreatedUpdatedByUser } from './createdUpdatedByUser';
import { DSPGroupItem } from './dSPGroupItem';
import { EnvironmentVariable } from './environmentVariable';
import { TransformationBlockAdditionalMountPoint } from './transformationBlockAdditionalMountPoint';
import { TransformationJobOperatesOnEnum } from './transformationJobOperatesOnEnum';

export class OrganizationTransformationBlock {
    'id': number;
    'name': string;
    'dockerContainer': string;
    'dockerContainerManagedByEdgeImpulse': boolean;
    'created': Date;
    'createdByUser'?: CreatedUpdatedByUser;
    'lastUpdated'?: Date;
    'lastUpdatedByUser'?: CreatedUpdatedByUser;
    'userId'?: number;
    'userName'?: string;
    'description': string;
    /**
    * These arguments are passed into the container
    */
    'cliArguments': string;
    'indMetadata': boolean;
    'requestsCpu'?: number;
    'requestsMemory'?: number;
    'limitsCpu'?: number;
    'limitsMemory'?: number;
    'additionalMountPoints': Array<TransformationBlockAdditionalMountPoint>;
    'operatesOn': TransformationJobOperatesOnEnum;
    'allowExtraCliArguments': boolean;
    /**
    * List of parameters, spec\'ed according to https://docs.edgeimpulse.com/docs/tips-and-tricks/adding-parameters-to-custom-blocks
    */
    'parameters'?: Array<object>;
    /**
    * List of parameters to be rendered in the UI
    */
    'parametersUI'?: Array<DSPGroupItem>;
    /**
    * 15m for 15 minutes, 2h for 2 hours, 1d for 1 day. If not set, the default is 8 hours.
    */
    'maxRunningTimeStr'?: string;
    'sourceCodeAvailable': boolean;
    /**
    * URL to the source code of this custom learn block.
    */
    'repositoryUrl'?: string;
    /**
    * Whether this block is publicly available to Edge Impulse users (if false, then only for members of the owning organization)
    */
    'isPublic': boolean;
    /**
    * Whether to show this block in \'Data sources\'. Only applies for standalone blocks.
    */
    'showInDataSources': boolean;
    /**
    * Whether to show this block in \'Create transformation job\'. Only applies for standalone blocks.
    */
    'showInCreateTransformationJob': boolean;
    /**
    * Whether to show this block in \'Synthetic data\'. Only applies for standalone blocks.
    */
    'showInSyntheticData': boolean;
    /**
    * Whether to show this block in \'AI Actions\'. Only applies for standalone blocks.
    */
    'showInAIActions': boolean;
    /**
    * Extra environmental variables that are passed into the transformation block (key/value pairs).
    */
    'environmentVariables': Array<EnvironmentVariable>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "dockerContainer",
            "baseName": "dockerContainer",
            "type": "string"
        },
        {
            "name": "dockerContainerManagedByEdgeImpulse",
            "baseName": "dockerContainerManagedByEdgeImpulse",
            "type": "boolean"
        },
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "createdByUser",
            "baseName": "createdByUser",
            "type": "CreatedUpdatedByUser"
        },
        {
            "name": "lastUpdated",
            "baseName": "lastUpdated",
            "type": "Date"
        },
        {
            "name": "lastUpdatedByUser",
            "baseName": "lastUpdatedByUser",
            "type": "CreatedUpdatedByUser"
        },
        {
            "name": "userId",
            "baseName": "userId",
            "type": "number"
        },
        {
            "name": "userName",
            "baseName": "userName",
            "type": "string"
        },
        {
            "name": "description",
            "baseName": "description",
            "type": "string"
        },
        {
            "name": "cliArguments",
            "baseName": "cliArguments",
            "type": "string"
        },
        {
            "name": "indMetadata",
            "baseName": "indMetadata",
            "type": "boolean"
        },
        {
            "name": "requestsCpu",
            "baseName": "requestsCpu",
            "type": "number"
        },
        {
            "name": "requestsMemory",
            "baseName": "requestsMemory",
            "type": "number"
        },
        {
            "name": "limitsCpu",
            "baseName": "limitsCpu",
            "type": "number"
        },
        {
            "name": "limitsMemory",
            "baseName": "limitsMemory",
            "type": "number"
        },
        {
            "name": "additionalMountPoints",
            "baseName": "additionalMountPoints",
            "type": "Array<TransformationBlockAdditionalMountPoint>"
        },
        {
            "name": "operatesOn",
            "baseName": "operatesOn",
            "type": "TransformationJobOperatesOnEnum"
        },
        {
            "name": "allowExtraCliArguments",
            "baseName": "allowExtraCliArguments",
            "type": "boolean"
        },
        {
            "name": "parameters",
            "baseName": "parameters",
            "type": "Array<object>"
        },
        {
            "name": "parametersUI",
            "baseName": "parametersUI",
            "type": "Array<DSPGroupItem>"
        },
        {
            "name": "maxRunningTimeStr",
            "baseName": "maxRunningTimeStr",
            "type": "string"
        },
        {
            "name": "sourceCodeAvailable",
            "baseName": "sourceCodeAvailable",
            "type": "boolean"
        },
        {
            "name": "repositoryUrl",
            "baseName": "repositoryUrl",
            "type": "string"
        },
        {
            "name": "isPublic",
            "baseName": "isPublic",
            "type": "boolean"
        },
        {
            "name": "showInDataSources",
            "baseName": "showInDataSources",
            "type": "boolean"
        },
        {
            "name": "showInCreateTransformationJob",
            "baseName": "showInCreateTransformationJob",
            "type": "boolean"
        },
        {
            "name": "showInSyntheticData",
            "baseName": "showInSyntheticData",
            "type": "boolean"
        },
        {
            "name": "showInAIActions",
            "baseName": "showInAIActions",
            "type": "boolean"
        },
        {
            "name": "environmentVariables",
            "baseName": "environmentVariables",
            "type": "Array<EnvironmentVariable>"
        }    ];

    static getAttributeTypeMap() {
        return OrganizationTransformationBlock.attributeTypeMap;
    }
}

