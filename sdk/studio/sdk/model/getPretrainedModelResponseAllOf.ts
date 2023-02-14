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

import { DeployPretrainedModelRequestModelInfo } from './deployPretrainedModelRequestModelInfo';
import { GetPretrainedModelResponseAllOfModel } from './getPretrainedModelResponseAllOfModel';

export class GetPretrainedModelResponseAllOf {
    'model'?: GetPretrainedModelResponseAllOfModel;
    'modelInfo'?: DeployPretrainedModelRequestModelInfo;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "model",
            "baseName": "model",
            "type": "GetPretrainedModelResponseAllOfModel"
        },
        {
            "name": "modelInfo",
            "baseName": "modelInfo",
            "type": "DeployPretrainedModelRequestModelInfo"
        }    ];

    static getAttributeTypeMap() {
        return GetPretrainedModelResponseAllOf.attributeTypeMap;
    }
}

