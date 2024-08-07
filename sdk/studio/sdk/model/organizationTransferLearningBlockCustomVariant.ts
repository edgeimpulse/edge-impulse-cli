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

import { OrganizationTransferLearningBlockModelFile } from './organizationTransferLearningBlockModelFile';

export class OrganizationTransferLearningBlockCustomVariant {
    /**
    * Unique identifier or key for this custom variant
    */
    'key': string;
    /**
    * Custom variant display name
    */
    'name': string;
    'modelFiles': Array<OrganizationTransferLearningBlockModelFile>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "key",
            "baseName": "key",
            "type": "string"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "modelFiles",
            "baseName": "modelFiles",
            "type": "Array<OrganizationTransferLearningBlockModelFile>"
        }    ];

    static getAttributeTypeMap() {
        return OrganizationTransferLearningBlockCustomVariant.attributeTypeMap;
    }
}

