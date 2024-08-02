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

import { ModelPrediction } from './modelPrediction';

export class DataExplorerPredictionsResponseAllOf {
    'predictions': Array<ModelPrediction>;
    'labels': Array<string>;
    'classificationType': DataExplorerPredictionsResponseAllOfClassificationTypeEnum;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "predictions",
            "baseName": "predictions",
            "type": "Array<ModelPrediction>"
        },
        {
            "name": "labels",
            "baseName": "labels",
            "type": "Array<string>"
        },
        {
            "name": "classificationType",
            "baseName": "classificationType",
            "type": "DataExplorerPredictionsResponseAllOfClassificationTypeEnum"
        }    ];

    static getAttributeTypeMap() {
        return DataExplorerPredictionsResponseAllOf.attributeTypeMap;
    }
}


export type DataExplorerPredictionsResponseAllOfClassificationTypeEnum = 'classification' | 'regression';
export const DataExplorerPredictionsResponseAllOfClassificationTypeEnumValues: string[] = ['classification', 'regression'];
