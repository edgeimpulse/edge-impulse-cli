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

import { TransformationJobStatusEnum } from './transformationJobStatusEnum';

export class OrganizationCreateProjectWithFilesAllOfFiles {
    'id': number;
    'fileName': string;
    'dataItemId': number;
    'dataItemName': string;
    'transformationJobId'?: number;
    'transformationJobStatus': TransformationJobStatusEnum;
    'linkToDataItem': string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "fileName",
            "baseName": "fileName",
            "type": "string"
        },
        {
            "name": "dataItemId",
            "baseName": "dataItemId",
            "type": "number"
        },
        {
            "name": "dataItemName",
            "baseName": "dataItemName",
            "type": "string"
        },
        {
            "name": "transformationJobId",
            "baseName": "transformationJobId",
            "type": "number"
        },
        {
            "name": "transformationJobStatus",
            "baseName": "transformationJobStatus",
            "type": "TransformationJobStatusEnum"
        },
        {
            "name": "linkToDataItem",
            "baseName": "linkToDataItem",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return OrganizationCreateProjectWithFilesAllOfFiles.attributeTypeMap;
    }
}

