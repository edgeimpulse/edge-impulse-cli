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

import { Sample } from './sample';

export class NeighborsScoreNeighborWindows {
    /**
    * The ID of the sample this window belongs to
    */
    'id': number;
    'sample'?: Sample;
    /**
    * The start time of this window in milliseconds
    */
    'windowStart': number;
    /**
    * The end time of this window in milliseconds
    */
    'windowEnd': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "sample",
            "baseName": "sample",
            "type": "Sample"
        },
        {
            "name": "windowStart",
            "baseName": "windowStart",
            "type": "number"
        },
        {
            "name": "windowEnd",
            "baseName": "windowEnd",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return NeighborsScoreNeighborWindows.attributeTypeMap;
    }
}

