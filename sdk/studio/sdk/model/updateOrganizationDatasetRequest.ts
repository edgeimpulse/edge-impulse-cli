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

import { UpdateOrganizationDatasetRequestBucket } from './updateOrganizationDatasetRequestBucket';

export class UpdateOrganizationDatasetRequest {
    'dataset'?: string;
    'tags'?: Array<string>;
    'category'?: string;
    'type'?: UpdateOrganizationDatasetRequestTypeEnum;
    'bucket'?: UpdateOrganizationDatasetRequestBucket;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "dataset",
            "baseName": "dataset",
            "type": "string"
        },
        {
            "name": "tags",
            "baseName": "tags",
            "type": "Array<string>"
        },
        {
            "name": "category",
            "baseName": "category",
            "type": "string"
        },
        {
            "name": "type",
            "baseName": "type",
            "type": "UpdateOrganizationDatasetRequestTypeEnum"
        },
        {
            "name": "bucket",
            "baseName": "bucket",
            "type": "UpdateOrganizationDatasetRequestBucket"
        }    ];

    static getAttributeTypeMap() {
        return UpdateOrganizationDatasetRequest.attributeTypeMap;
    }
}


export type UpdateOrganizationDatasetRequestTypeEnum = 'clinical' | 'files';
export const UpdateOrganizationDatasetRequestTypeEnumValues: string[] = ['clinical', 'files'];
