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

import { ProfileModelTableMcuMemory } from './profileModelTableMcuMemory';

export class ProfileModelTableMcu {
    'description': string;
    'timePerInferenceMs'?: number;
    'memory'?: ProfileModelTableMcuMemory;
    'supported': boolean;
    'mcuSupportError'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "description",
            "baseName": "description",
            "type": "string"
        },
        {
            "name": "timePerInferenceMs",
            "baseName": "timePerInferenceMs",
            "type": "number"
        },
        {
            "name": "memory",
            "baseName": "memory",
            "type": "ProfileModelTableMcuMemory"
        },
        {
            "name": "supported",
            "baseName": "supported",
            "type": "boolean"
        },
        {
            "name": "mcuSupportError",
            "baseName": "mcuSupportError",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return ProfileModelTableMcu.attributeTypeMap;
    }
}

