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

import { ListOrganizationApiKeysResponseAllOfApiKeys } from './listOrganizationApiKeysResponseAllOfApiKeys';

export class ListOrganizationApiKeysResponseAllOf {
    /**
    * List of API keys.
    */
    'apiKeys': Array<ListOrganizationApiKeysResponseAllOfApiKeys>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "apiKeys",
            "baseName": "apiKeys",
            "type": "Array<ListOrganizationApiKeysResponseAllOfApiKeys>"
        }    ];

    static getAttributeTypeMap() {
        return ListOrganizationApiKeysResponseAllOf.attributeTypeMap;
    }
}

