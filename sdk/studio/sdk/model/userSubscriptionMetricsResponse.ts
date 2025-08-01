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

import { GenericApiResponse } from './genericApiResponse';
import { UserSubscriptionMetricsResponseAllOf } from './userSubscriptionMetricsResponseAllOf';
import { UserSubscriptionMetricsResponseAllOfMetrics } from './userSubscriptionMetricsResponseAllOfMetrics';

export class UserSubscriptionMetricsResponse {
    /**
    * Whether the operation succeeded
    */
    'success': boolean;
    /**
    * Optional error description (set if \'success\' was false)
    */
    'error'?: string;
    'metrics'?: UserSubscriptionMetricsResponseAllOfMetrics;
    /**
    * Number of compute minutes remaining before reaching the monthly compute limit. This field is only present when the user has fewer than 60 minutes left. Once the limit is reached, users can continue using compute resources by subscribing to the pay-as-you-go plan. 
    */
    'approachingComputeLimitMinutesLeft'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "success",
            "baseName": "success",
            "type": "boolean"
        },
        {
            "name": "error",
            "baseName": "error",
            "type": "string"
        },
        {
            "name": "metrics",
            "baseName": "metrics",
            "type": "UserSubscriptionMetricsResponseAllOfMetrics"
        },
        {
            "name": "approachingComputeLimitMinutesLeft",
            "baseName": "approachingComputeLimitMinutesLeft",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return UserSubscriptionMetricsResponse.attributeTypeMap;
    }
}

