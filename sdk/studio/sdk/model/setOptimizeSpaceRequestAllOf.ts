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

import { OptimizeSpaceResponseAllOf } from './optimizeSpaceResponseAllOf';

export class SetOptimizeSpaceRequestAllOf {
    'space'?: OptimizeSpaceResponseAllOf;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "space",
            "baseName": "space",
            "type": "OptimizeSpaceResponseAllOf"
        }    ];

    static getAttributeTypeMap() {
        return SetOptimizeSpaceRequestAllOf.attributeTypeMap;
    }
}

