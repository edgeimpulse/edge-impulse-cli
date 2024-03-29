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


export class AddOrganizationApiKeyRequestAllOf {
    'role': AddOrganizationApiKeyRequestAllOfRoleEnum;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "role",
            "baseName": "role",
            "type": "AddOrganizationApiKeyRequestAllOfRoleEnum"
        }    ];

    static getAttributeTypeMap() {
        return AddOrganizationApiKeyRequestAllOf.attributeTypeMap;
    }
}


export type AddOrganizationApiKeyRequestAllOfRoleEnum = 'admin' | 'member';
export const AddOrganizationApiKeyRequestAllOfRoleEnumValues: string[] = ['admin', 'member'];
