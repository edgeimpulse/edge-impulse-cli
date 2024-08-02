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

import { ProfileModelInfo } from './profileModelInfo';
import { ProfileModelTable } from './profileModelTable';

export class GetPretrainedModelResponseAllOfModelProfileInfo {
    'float32'?: ProfileModelInfo;
    'int8'?: ProfileModelInfo;
    'table': ProfileModelTable;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "float32",
            "baseName": "float32",
            "type": "ProfileModelInfo"
        },
        {
            "name": "int8",
            "baseName": "int8",
            "type": "ProfileModelInfo"
        },
        {
            "name": "table",
            "baseName": "table",
            "type": "ProfileModelTable"
        }    ];

    static getAttributeTypeMap() {
        return GetPretrainedModelResponseAllOfModelProfileInfo.attributeTypeMap;
    }
}

