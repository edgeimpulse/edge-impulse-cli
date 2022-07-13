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

import { UserStaffInfo } from './userStaffInfo';

export class OrganizationUser {
    'id': number;
    'username': string;
    'name': string;
    'photo'?: string;
    'created': Date;
    'added': Date;
    'email': string;
    'role': OrganizationUserRoleEnum;
    'staffInfo': UserStaffInfo;
    'projectCount': number;
    'datasets': Array<string>;
    'pending': boolean;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "username",
            "baseName": "username",
            "type": "string"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "photo",
            "baseName": "photo",
            "type": "string"
        },
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "added",
            "baseName": "added",
            "type": "Date"
        },
        {
            "name": "email",
            "baseName": "email",
            "type": "string"
        },
        {
            "name": "role",
            "baseName": "role",
            "type": "OrganizationUserRoleEnum"
        },
        {
            "name": "staffInfo",
            "baseName": "staffInfo",
            "type": "UserStaffInfo"
        },
        {
            "name": "projectCount",
            "baseName": "projectCount",
            "type": "number"
        },
        {
            "name": "datasets",
            "baseName": "datasets",
            "type": "Array<string>"
        },
        {
            "name": "pending",
            "baseName": "pending",
            "type": "boolean"
        }    ];

    static getAttributeTypeMap() {
        return OrganizationUser.attributeTypeMap;
    }
}


export type OrganizationUserRoleEnum = 'admin' | 'member' | 'guest';
export const OrganizationUserRoleEnumValues: string[] = ['admin', 'member', 'guest'];
