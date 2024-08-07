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

import { DetailedImpulse } from './detailedImpulse';
import { GetAllDetailedImpulsesResponseAllOfMetricKeysByCategory } from './getAllDetailedImpulsesResponseAllOfMetricKeysByCategory';

export class GetAllDetailedImpulsesResponseAllOf {
    'impulses': Array<DetailedImpulse>;
    'metricKeysByCategory': Array<GetAllDetailedImpulsesResponseAllOfMetricKeysByCategory>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "impulses",
            "baseName": "impulses",
            "type": "Array<DetailedImpulse>"
        },
        {
            "name": "metricKeysByCategory",
            "baseName": "metricKeysByCategory",
            "type": "Array<GetAllDetailedImpulsesResponseAllOfMetricKeysByCategory>"
        }    ];

    static getAttributeTypeMap() {
        return GetAllDetailedImpulsesResponseAllOf.attributeTypeMap;
    }
}

