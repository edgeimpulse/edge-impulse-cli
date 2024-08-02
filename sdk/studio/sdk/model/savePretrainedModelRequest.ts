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

import { DeployPretrainedModelInputTimeSeries } from './deployPretrainedModelInputTimeSeries';
import { DeployPretrainedModelInputAudio } from './deployPretrainedModelInputAudio';
import { DeployPretrainedModelInputImage } from './deployPretrainedModelInputImage';
import { DeployPretrainedModelInputOther } from './deployPretrainedModelInputOther';
import { DeployPretrainedModelModelClassification } from './deployPretrainedModelModelClassification';
import { DeployPretrainedModelModelRegression } from './deployPretrainedModelModelRegression';
import { DeployPretrainedModelModelObjectDetection } from './deployPretrainedModelModelObjectDetection';

export class SavePretrainedModelRequest {
    'input': DeployPretrainedModelInputTimeSeries | DeployPretrainedModelInputAudio | DeployPretrainedModelInputImage | DeployPretrainedModelInputOther;
    'model': DeployPretrainedModelModelClassification | DeployPretrainedModelModelRegression | DeployPretrainedModelModelObjectDetection;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "input",
            "baseName": "input",
            "type": "DeployPretrainedModelInputTimeSeries | DeployPretrainedModelInputAudio | DeployPretrainedModelInputImage | DeployPretrainedModelInputOther"
        },
        {
            "name": "model",
            "baseName": "model",
            "type": "DeployPretrainedModelModelClassification | DeployPretrainedModelModelRegression | DeployPretrainedModelModelObjectDetection"
        }    ];

    static getAttributeTypeMap() {
        return SavePretrainedModelRequest.attributeTypeMap;
    }
}

