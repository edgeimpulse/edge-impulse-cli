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

import { DSPConfig } from './dSPConfig';
import { DSPGroup } from './dSPGroup';
import { DSPInfo } from './dSPInfo';
import { GenericApiResponse } from './genericApiResponse';

export class DSPConfigResponse {
    /**
    * Whether the operation succeeded
    */
    'success': boolean;
    /**
    * Optional error description (set if \'success\' was false)
    */
    'error'?: string;
    'dsp'?: DSPInfo;
    'config'?: Array<DSPGroup>;
    'configError'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "success",
            "baseName": "success",
            "type": "boolean"
        },
        {
            "name": "error",
            "baseName": "error",
            "type": "string"
        },
        {
            "name": "dsp",
            "baseName": "dsp",
            "type": "DSPInfo"
        },
        {
            "name": "config",
            "baseName": "config",
            "type": "Array<DSPGroup>"
        },
        {
            "name": "configError",
            "baseName": "configError",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return DSPConfigResponse.attributeTypeMap;
    }
}

