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

import { AIActionsOperatesOn } from './aIActionsOperatesOn';
import { DSPGroupItem } from './dSPGroupItem';
import { TransformationJobOperatesOnEnum } from './transformationJobOperatesOnEnum';

export class PublicOrganizationTransformationBlock {
    'id': number;
    'ownerOrganizationId': number;
    'ownerOrganizationName': string;
    'name': string;
    'created': Date;
    'lastUpdated'?: Date;
    'description': string;
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
    * URL to the source code of this custom learn block.
    */
    'repositoryUrl'?: string;
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
    * Whether to show this block in \'AI Labeling\'. Only applies for standalone blocks.
    */
    'showInAIActions': boolean;
    /**
    * For AI labeling blocks, this lists the data types that the block supports. If this field is empty then there\'s no information about supported data types.
    */
    'aiActionsOperatesOn'?: Array<AIActionsOperatesOn>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "ownerOrganizationId",
            "baseName": "ownerOrganizationId",
            "type": "number"
        },
        {
            "name": "ownerOrganizationName",
            "baseName": "ownerOrganizationName",
            "type": "string"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "lastUpdated",
            "baseName": "lastUpdated",
            "type": "Date"
        },
        {
            "name": "description",
            "baseName": "description",
            "type": "string"
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
            "name": "repositoryUrl",
            "baseName": "repositoryUrl",
            "type": "string"
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
            "name": "aiActionsOperatesOn",
            "baseName": "aiActionsOperatesOn",
            "type": "Array<AIActionsOperatesOn>"
        }    ];

    static getAttributeTypeMap() {
        return PublicOrganizationTransformationBlock.attributeTypeMap;
    }
}

