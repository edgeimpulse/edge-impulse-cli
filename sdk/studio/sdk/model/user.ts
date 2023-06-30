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

import { Permission } from './permission';
import { StaffInfo } from './staffInfo';

export class User {
    'id': number;
    'username': string;
    'name': string;
    'email': string;
    'photo'?: string;
    'created': Date;
    'lastSeen'?: Date;
    'staffInfo': StaffInfo;
    'pending': boolean;
    'lastTosAcceptanceDate'?: Date;
    'jobTitle'?: string;
    /**
    * List of permissions the user has
    */
    'permissions'?: Array<Permission>;
    'companyName'?: string;
    /**
    * Whether the user has activated their account or not.
    */
    'activated': boolean;

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
            "name": "email",
            "baseName": "email",
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
            "name": "lastSeen",
            "baseName": "lastSeen",
            "type": "Date"
        },
        {
            "name": "staffInfo",
            "baseName": "staffInfo",
            "type": "StaffInfo"
        },
        {
            "name": "pending",
            "baseName": "pending",
            "type": "boolean"
        },
        {
            "name": "lastTosAcceptanceDate",
            "baseName": "lastTosAcceptanceDate",
            "type": "Date"
        },
        {
            "name": "jobTitle",
            "baseName": "jobTitle",
            "type": "string"
        },
        {
            "name": "permissions",
            "baseName": "permissions",
            "type": "Array<Permission>"
        },
        {
            "name": "companyName",
            "baseName": "companyName",
            "type": "string"
        },
        {
            "name": "activated",
            "baseName": "activated",
            "type": "boolean"
        }    ];

    static getAttributeTypeMap() {
        return User.attributeTypeMap;
    }
}

