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

import { DailyMetricsRecord } from './dailyMetricsRecord';
import { EnterpriseTrial } from './enterpriseTrial';
import { Project } from './project';
import { UserExperiment } from './userExperiment';
import { UserOrganization } from './userOrganization';
import { UserTierEnum } from './userTierEnum';

export class AdminApiUserAllOf {
    'email': string;
    'activated': boolean;
    /**
    * Organizations that the user is a member of. Only filled when requesting information about yourself.
    */
    'organizations': Array<UserOrganization>;
    'projects': Array<Project>;
    /**
    * Experiments the user has access to. Enabling experiments can only be done through a JWT token.
    */
    'experiments': Array<UserExperiment>;
    /**
    * Whether this is an ephemeral evaluation account.
    */
    'evaluation'?: boolean;
    /**
    * Whether this user is an ambassador.
    */
    'ambassador'?: boolean;
    'tier': UserTierEnum;
    'lastSeen'?: Date;
    /**
    * Whether the user is suspended.
    */
    'suspended': boolean;
    /**
    * Current or past enterprise trials.
    */
    'trials': Array<EnterpriseTrial>;
    /**
    * Metrics for the last 365 days
    */
    'dailyMetrics'?: Array<DailyMetricsRecord> | null;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "email",
            "baseName": "email",
            "type": "string"
        },
        {
            "name": "activated",
            "baseName": "activated",
            "type": "boolean"
        },
        {
            "name": "organizations",
            "baseName": "organizations",
            "type": "Array<UserOrganization>"
        },
        {
            "name": "projects",
            "baseName": "projects",
            "type": "Array<Project>"
        },
        {
            "name": "experiments",
            "baseName": "experiments",
            "type": "Array<UserExperiment>"
        },
        {
            "name": "evaluation",
            "baseName": "evaluation",
            "type": "boolean"
        },
        {
            "name": "ambassador",
            "baseName": "ambassador",
            "type": "boolean"
        },
        {
            "name": "tier",
            "baseName": "tier",
            "type": "UserTierEnum"
        },
        {
            "name": "lastSeen",
            "baseName": "lastSeen",
            "type": "Date"
        },
        {
            "name": "suspended",
            "baseName": "suspended",
            "type": "boolean"
        },
        {
            "name": "trials",
            "baseName": "trials",
            "type": "Array<EnterpriseTrial>"
        },
        {
            "name": "dailyMetrics",
            "baseName": "dailyMetrics",
            "type": "Array<DailyMetricsRecord>"
        }    ];

    static getAttributeTypeMap() {
        return AdminApiUserAllOf.attributeTypeMap;
    }
}

