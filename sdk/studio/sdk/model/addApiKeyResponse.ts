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

import { AddApiKeyResponseAllOf } from './addApiKeyResponseAllOf';
import { GenericApiResponse } from './genericApiResponse';

export class AddApiKeyResponse {
    /**
    * Whether the operation succeeded
    */
    'success': boolean;
    /**
    * Optional error description (set if \'success\' was false)
    */
    'error'?: string;
    /**
    * ID of the new API key
    */
    'id': number;
    /**
    * New API Key (starts with \"ei_...\") - this\'ll be shared only once.
    */
    'apiKey': string;

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
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "apiKey",
            "baseName": "apiKey",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return AddApiKeyResponse.attributeTypeMap;
    }
}

