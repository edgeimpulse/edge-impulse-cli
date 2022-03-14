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

import { DSPInfoFeatures } from './dSPInfoFeatures';
import { DspRunResponseAllOfPerformance } from './dspRunResponseAllOfPerformance';

export class DSPInfo {
    'id': number;
    'name': string;
    'windowLength': number;
    'type': string;
    'classes': Array<string>;
    'features': DSPInfoFeatures;
    /**
    * Expected number of windows that would be generated
    */
    'expectedWindowCount': number;
    /**
    * Axes that this block depends on.
    */
    'inputAxes': Array<string>;
    'performance'?: DspRunResponseAllOfPerformance;
    'canCalculateFeatureImportance': boolean;
    'calculateFeatureImportance': boolean;

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
            "name": "windowLength",
            "baseName": "windowLength",
            "type": "number"
        },
        {
            "name": "type",
            "baseName": "type",
            "type": "string"
        },
        {
            "name": "classes",
            "baseName": "classes",
            "type": "Array<string>"
        },
        {
            "name": "features",
            "baseName": "features",
            "type": "DSPInfoFeatures"
        },
        {
            "name": "expectedWindowCount",
            "baseName": "expectedWindowCount",
            "type": "number"
        },
        {
            "name": "inputAxes",
            "baseName": "inputAxes",
            "type": "Array<string>"
        },
        {
            "name": "performance",
            "baseName": "performance",
            "type": "DspRunResponseAllOfPerformance"
        },
        {
            "name": "canCalculateFeatureImportance",
            "baseName": "canCalculateFeatureImportance",
            "type": "boolean"
        },
        {
            "name": "calculateFeatureImportance",
            "baseName": "calculateFeatureImportance",
            "type": "boolean"
        }    ];

    static getAttributeTypeMap() {
        return DSPInfo.attributeTypeMap;
    }
}

