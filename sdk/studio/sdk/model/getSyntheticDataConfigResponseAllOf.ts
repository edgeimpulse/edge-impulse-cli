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

import { GetSyntheticDataConfigResponseAllOfRecentJobs } from './getSyntheticDataConfigResponseAllOfRecentJobs';

export class GetSyntheticDataConfigResponseAllOf {
    'recentJobs': Array<GetSyntheticDataConfigResponseAllOfRecentJobs>;
    'lastUsedTransformationBlockId'?: number;
    'lastUsedParameters'?: { [key: string]: string; };

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "recentJobs",
            "baseName": "recentJobs",
            "type": "Array<GetSyntheticDataConfigResponseAllOfRecentJobs>"
        },
        {
            "name": "lastUsedTransformationBlockId",
            "baseName": "lastUsedTransformationBlockId",
            "type": "number"
        },
        {
            "name": "lastUsedParameters",
            "baseName": "lastUsedParameters",
            "type": "{ [key: string]: string; }"
        }    ];

    static getAttributeTypeMap() {
        return GetSyntheticDataConfigResponseAllOf.attributeTypeMap;
    }
}

