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

import { AIActionsConfigStep } from './aIActionsConfigStep';
import { AIActionsDataCategory } from './aIActionsDataCategory';
import { DspAutotunerResultsAllOfResults } from './dspAutotunerResultsAllOfResults';

export class UpdateAIActionRequest {
    /**
    * User-provided name. If no name is set then displayName on the action will be automatically configured based on the transformation block.
    */
    'name'?: string;
    'steps': Array<AIActionsConfigStep>;
    'dataCategory': AIActionsDataCategory;
    /**
    * Metadata key to filter on. Required if dataCategory is equal to \"dataWithoutMetadataKey\" or \"dataWithMetadata\".
    */
    'dataMetadataKey'?: string;
    /**
    * Metadata value to filter on. Required if dataCategory is equal to \"dataWithMetadata\".
    */
    'dataMetadataValue'?: string;
    /**
    * After the action runs, add this key/value pair as metadata on the affected samples.
    */
    'setMetadataAfterRunning': Array<DspAutotunerResultsAllOfResults>;
    /**
    * Numeric value (1..n) where this action should be shown in the action list (and in which order the actions should run when started from a data source).
    */
    'sortOrder'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "steps",
            "baseName": "steps",
            "type": "Array<AIActionsConfigStep>"
        },
        {
            "name": "dataCategory",
            "baseName": "dataCategory",
            "type": "AIActionsDataCategory"
        },
        {
            "name": "dataMetadataKey",
            "baseName": "dataMetadataKey",
            "type": "string"
        },
        {
            "name": "dataMetadataValue",
            "baseName": "dataMetadataValue",
            "type": "string"
        },
        {
            "name": "setMetadataAfterRunning",
            "baseName": "setMetadataAfterRunning",
            "type": "Array<DspAutotunerResultsAllOfResults>"
        },
        {
            "name": "sortOrder",
            "baseName": "sortOrder",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return UpdateAIActionRequest.attributeTypeMap;
    }
}

