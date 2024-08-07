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

import { OrganizationDatasetTypeEnum } from './organizationDatasetTypeEnum';

export class OrganizationPipelineFeedingIntoDataset {
    'dataset': string;
    'datasetLink': string;
    'itemCount': number;
    'itemCountChecklistOK': number;
    'itemCountChecklistError': number;
    'datasetType'?: OrganizationDatasetTypeEnum;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "dataset",
            "baseName": "dataset",
            "type": "string"
        },
        {
            "name": "datasetLink",
            "baseName": "datasetLink",
            "type": "string"
        },
        {
            "name": "itemCount",
            "baseName": "itemCount",
            "type": "number"
        },
        {
            "name": "itemCountChecklistOK",
            "baseName": "itemCountChecklistOK",
            "type": "number"
        },
        {
            "name": "itemCountChecklistError",
            "baseName": "itemCountChecklistError",
            "type": "number"
        },
        {
            "name": "datasetType",
            "baseName": "datasetType",
            "type": "OrganizationDatasetTypeEnum"
        }    ];

    static getAttributeTypeMap() {
        return OrganizationPipelineFeedingIntoDataset.attributeTypeMap;
    }
}

