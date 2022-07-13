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

import { ClassifyJobResponseAllOfResult } from './classifyJobResponseAllOfResult';
import { ModelPrediction } from './modelPrediction';

export class ClassifyJobResponseAllOf {
    'result': Array<ClassifyJobResponseAllOfResult>;
    'predictions': Array<ModelPrediction>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "result",
            "baseName": "result",
            "type": "Array<ClassifyJobResponseAllOfResult>"
        },
        {
            "name": "predictions",
            "baseName": "predictions",
            "type": "Array<ModelPrediction>"
        }    ];

    static getAttributeTypeMap() {
        return ClassifyJobResponseAllOf.attributeTypeMap;
    }
}

