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
import { EntitlementLimits } from './entitlementLimits';

export class AdminOrganizationInfoResponseAllOf {
    'billable'?: boolean;
    'entitlementLimits'?: EntitlementLimits;
    /**
    * The date from which the compute time for the running contract is calculated.
    */
    'computeTimeCurrentContractSince'?: Date;
    /**
    * Total storage used by the organization.
    */
    'totalStorage'?: number;
    /**
    * Metrics for the last 365 days
    */
    'dailyMetrics'?: Array<DailyMetricsRecord> | null;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "billable",
            "baseName": "billable",
            "type": "boolean"
        },
        {
            "name": "entitlementLimits",
            "baseName": "entitlementLimits",
            "type": "EntitlementLimits"
        },
        {
            "name": "computeTimeCurrentContractSince",
            "baseName": "computeTimeCurrentContractSince",
            "type": "Date"
        },
        {
            "name": "totalStorage",
            "baseName": "totalStorage",
            "type": "number"
        },
        {
            "name": "dailyMetrics",
            "baseName": "dailyMetrics",
            "type": "Array<DailyMetricsRecord>"
        }    ];

    static getAttributeTypeMap() {
        return AdminOrganizationInfoResponseAllOf.attributeTypeMap;
    }
}

