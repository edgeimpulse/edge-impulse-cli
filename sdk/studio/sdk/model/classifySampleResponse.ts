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

import { ClassifySampleResponseAllOf } from './classifySampleResponseAllOf';
import { ClassifySampleResponseClassification } from './classifySampleResponseClassification';
import { GenericApiResponse } from './genericApiResponse';
import { RawSampleData } from './rawSampleData';

export class ClassifySampleResponse {
    /**
    * Whether the operation succeeded
    */
    'success': boolean;
    /**
    * Optional error description (set if \'success\' was false)
    */
    'error'?: string;
    'classifications': Array<ClassifySampleResponseClassification>;
    'sample': RawSampleData;
    /**
    * Size of the sliding window (as set by the impulse) in milliseconds.
    */
    'windowSizeMs': number;
    /**
    * Number of milliseconds that the sliding window increased with (as set by the impulse)
    */
    'windowIncreaseMs': number;
    /**
    * Whether this sample is already in the training database
    */
    'alreadyInDatabase': boolean;
    'warning'?: string;

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
            "name": "classifications",
            "baseName": "classifications",
            "type": "Array<ClassifySampleResponseClassification>"
        },
        {
            "name": "sample",
            "baseName": "sample",
            "type": "RawSampleData"
        },
        {
            "name": "windowSizeMs",
            "baseName": "windowSizeMs",
            "type": "number"
        },
        {
            "name": "windowIncreaseMs",
            "baseName": "windowIncreaseMs",
            "type": "number"
        },
        {
            "name": "alreadyInDatabase",
            "baseName": "alreadyInDatabase",
            "type": "boolean"
        },
        {
            "name": "warning",
            "baseName": "warning",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return ClassifySampleResponse.attributeTypeMap;
    }
}

