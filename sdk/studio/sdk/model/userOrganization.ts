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

import { EntitlementLimits } from './entitlementLimits';
import { UserOrganizationPublicProjectLicense } from './userOrganizationPublicProjectLicense';

export class UserOrganization {
    'id': number;
    'name': string;
    'logo'?: string;
    'isDeveloperProfile': boolean;
    /**
    * Unique identifier of the white label this project belongs to, if any.
    */
    'whitelabelId': number | null;
    /**
    * Whether the user is admin of this organization or not.
    */
    'isAdmin': boolean;
    /**
    * When the organization was created.
    */
    'created': Date;
    /**
    * Unique identifier of the trial this organization belongs to, if any.
    */
    'trialId': number | null;
    /**
    * Date when the trial expired, if any. A expired trial has a grace period of 30 days before it\'s associated organization is deleted.
    */
    'trialExpiredDate': Date | null;
    /**
    * Date when the trial was upgraded to a full enterprise account, if any.
    */
    'trialUpgradedDate': Date | null;
    'entitlementLimits': EntitlementLimits;
    /**
    * The total number of users that are a member of this organization.
    */
    'userCount': number;
    /**
    * The number of admin users for this organization.
    */
    'adminCount': number;
    /**
    * The number of private projects for this organization.
    */
    'privateProjectCount': number;
    /**
    * Last time this user accessed this organization.
    */
    'lastAccessed'?: Date;
    'publicProjectLicense': UserOrganizationPublicProjectLicense;

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
            "name": "logo",
            "baseName": "logo",
            "type": "string"
        },
        {
            "name": "isDeveloperProfile",
            "baseName": "isDeveloperProfile",
            "type": "boolean"
        },
        {
            "name": "whitelabelId",
            "baseName": "whitelabelId",
            "type": "number"
        },
        {
            "name": "isAdmin",
            "baseName": "isAdmin",
            "type": "boolean"
        },
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "trialId",
            "baseName": "trialId",
            "type": "number"
        },
        {
            "name": "trialExpiredDate",
            "baseName": "trialExpiredDate",
            "type": "Date"
        },
        {
            "name": "trialUpgradedDate",
            "baseName": "trialUpgradedDate",
            "type": "Date"
        },
        {
            "name": "entitlementLimits",
            "baseName": "entitlementLimits",
            "type": "EntitlementLimits"
        },
        {
            "name": "userCount",
            "baseName": "userCount",
            "type": "number"
        },
        {
            "name": "adminCount",
            "baseName": "adminCount",
            "type": "number"
        },
        {
            "name": "privateProjectCount",
            "baseName": "privateProjectCount",
            "type": "number"
        },
        {
            "name": "lastAccessed",
            "baseName": "lastAccessed",
            "type": "Date"
        },
        {
            "name": "publicProjectLicense",
            "baseName": "publicProjectLicense",
            "type": "UserOrganizationPublicProjectLicense"
        }    ];

    static getAttributeTypeMap() {
        return UserOrganization.attributeTypeMap;
    }
}

