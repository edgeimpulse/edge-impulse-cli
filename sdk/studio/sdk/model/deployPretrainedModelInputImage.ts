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

import { ImageInputResizeMode } from './imageInputResizeMode';
import { ImageInputScaling } from './imageInputScaling';

export class DeployPretrainedModelInputImage {
    'inputType': DeployPretrainedModelInputImageInputTypeEnum;
    'inputScaling'?: ImageInputScaling;
    'resizeMode'?: ImageInputResizeMode;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "inputType",
            "baseName": "inputType",
            "type": "DeployPretrainedModelInputImageInputTypeEnum"
        },
        {
            "name": "inputScaling",
            "baseName": "inputScaling",
            "type": "ImageInputScaling"
        },
        {
            "name": "resizeMode",
            "baseName": "resizeMode",
            "type": "ImageInputResizeMode"
        }    ];

    static getAttributeTypeMap() {
        return DeployPretrainedModelInputImage.attributeTypeMap;
    }
}


export type DeployPretrainedModelInputImageInputTypeEnum = 'image';
export const DeployPretrainedModelInputImageInputTypeEnumValues: string[] = ['image'];
