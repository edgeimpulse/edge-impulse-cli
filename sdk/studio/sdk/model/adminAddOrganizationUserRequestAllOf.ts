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

import { OrganizationMemberRole } from './organizationMemberRole';

export class AdminAddOrganizationUserRequestAllOf {
    'role': OrganizationMemberRole;
    /**
    * Only used for \'guest\' users. Limits the datasets the user has access to.
    */
    'datasets': Array<string>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "role",
            "baseName": "role",
            "type": "OrganizationMemberRole"
        },
        {
            "name": "datasets",
            "baseName": "datasets",
            "type": "Array<string>"
        }    ];

    static getAttributeTypeMap() {
        return AdminAddOrganizationUserRequestAllOf.attributeTypeMap;
    }
}

