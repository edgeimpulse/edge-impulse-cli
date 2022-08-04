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

export class User {
    'id': number;
    'username': string;
    'name': string;
    'photo'?: string;
    'created': Date;
    'staffInfo': UserStaffInfo;
    'pending': boolean;
    'lastTosAcceptanceDate'?: Date;

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
            "name": "staffInfo",
            "baseName": "staffInfo",
            "type": "UserStaffInfo"
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
        }    ];

    static getAttributeTypeMap() {
        return User.attributeTypeMap;
    }
}

