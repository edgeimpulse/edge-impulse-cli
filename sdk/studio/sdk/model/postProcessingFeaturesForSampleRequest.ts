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

import { KerasModelVariantEnum } from './kerasModelVariantEnum';
import { PostProcessingConfigRequest } from './postProcessingConfigRequest';

export class PostProcessingFeaturesForSampleRequest {
    'config': PostProcessingConfigRequest;
    'variant': KerasModelVariantEnum;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "config",
            "baseName": "config",
            "type": "PostProcessingConfigRequest"
        },
        {
            "name": "variant",
            "baseName": "variant",
            "type": "KerasModelVariantEnum"
        }    ];

    static getAttributeTypeMap() {
        return PostProcessingFeaturesForSampleRequest.attributeTypeMap;
    }
}

