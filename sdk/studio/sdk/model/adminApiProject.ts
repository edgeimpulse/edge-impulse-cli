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


export class AdminApiProject {
    'id': number;
    'name': string;
    'description'?: string;
    'created'?: Date;
    /**
    * User or organization that owns the project
    */
    'owner': string;
    'ownerUserId'?: number;
    'ownerOrganizationId'?: number;
    'lastAccessed'?: Date;
    /**
    * Unique identifier of the white label this project belongs to, if any.
    */
    'whitelabelId'?: number | null;
    'tier'?: AdminApiProjectTierEnum;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "description",
            "baseName": "description",
            "type": "string"
        },
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "owner",
            "baseName": "owner",
            "type": "string"
        },
        {
            "name": "ownerUserId",
            "baseName": "ownerUserId",
            "type": "number"
        },
        {
            "name": "ownerOrganizationId",
            "baseName": "ownerOrganizationId",
            "type": "number"
        },
        {
            "name": "lastAccessed",
            "baseName": "lastAccessed",
            "type": "Date"
        },
        {
            "name": "whitelabelId",
            "baseName": "whitelabelId",
            "type": "number"
        },
        {
            "name": "tier",
            "baseName": "tier",
            "type": "AdminApiProjectTierEnum"
        }    ];

    static getAttributeTypeMap() {
        return AdminApiProject.attributeTypeMap;
    }
}


export type AdminApiProjectTierEnum = 'free' | 'pro' | 'enterprise';
export const AdminApiProjectTierEnumValues: string[] = ['free', 'pro', 'enterprise'];
