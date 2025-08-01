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

import { GenericApiResponse } from './genericApiResponse';
import { MetadataFilterOptions } from './metadataFilterOptions';
import { MetadataFilterOptionsOptionsList } from './metadataFilterOptionsOptionsList';

export class GetSampleMetadataFilterOptionsResponse {
    /**
    * Whether the operation succeeded
    */
    'success': boolean;
    /**
    * Optional error description (set if \'success\' was false)
    */
    'error'?: string;
    'totalCount': number;
    'count': number;
    /**
    * Available metadata filter options that can be supplied to the /raw-data/ endpoint to filter samples
    */
    'optionsList': Array<MetadataFilterOptionsOptionsList>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "success",
            "baseName": "success",
            "type": "boolean"
        },
        {
            "name": "error",
            "baseName": "error",
            "type": "string"
        },
        {
            "name": "totalCount",
            "baseName": "totalCount",
            "type": "number"
        },
        {
            "name": "count",
            "baseName": "count",
            "type": "number"
        },
        {
            "name": "optionsList",
            "baseName": "optionsList",
            "type": "Array<MetadataFilterOptionsOptionsList>"
        }    ];

    static getAttributeTypeMap() {
        return GetSampleMetadataFilterOptionsResponse.attributeTypeMap;
    }
}

