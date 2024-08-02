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
import { OrganizationUserAllOf } from './organizationUserAllOf';
import { Permission } from './permission';
import { StaffInfo } from './staffInfo';
import { User } from './user';
import { UserTierEnum } from './userTierEnum';

export class OrganizationUser {
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
    /**
    * Whether the user has configured multi-factor authentication
    */
    'mfaConfigured': boolean;
    /**
    * Stripe customer ID, if any.
    */
    'stripeCustomerId'?: string;
    /**
    * Whether the user has pending payments.
    */
    'hasPendingPayments'?: boolean;
    'tier'?: UserTierEnum;
    'added': Date;
    'role': OrganizationMemberRole;
    'projectCount': number;
    'datasets': Array<string>;

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
        },
        {
            "name": "mfaConfigured",
            "baseName": "mfaConfigured",
            "type": "boolean"
        },
        {
            "name": "stripeCustomerId",
            "baseName": "stripeCustomerId",
            "type": "string"
        },
        {
            "name": "hasPendingPayments",
            "baseName": "hasPendingPayments",
            "type": "boolean"
        },
        {
            "name": "tier",
            "baseName": "tier",
            "type": "UserTierEnum"
        },
        {
            "name": "added",
            "baseName": "added",
            "type": "Date"
        },
        {
            "name": "role",
            "baseName": "role",
            "type": "OrganizationMemberRole"
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
        }    ];

    static getAttributeTypeMap() {
        return OrganizationUser.attributeTypeMap;
    }
}

