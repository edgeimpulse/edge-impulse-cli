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

import { AutoLabelerSegment } from './autoLabelerSegment';
import { GenericApiResponse } from './genericApiResponse';
import { GetAutoLabelerSegmentInfoResponseAllOf } from './getAutoLabelerSegmentInfoResponseAllOf';
import { Sample } from './sample';

export class GetAutoLabelerSegmentInfoResponse {
    /**
    * Whether the operation succeeded
    */
    'success': boolean;
    /**
    * Optional error description (set if \'success\' was false)
    */
    'error'?: string;
    'sample': Sample;
    'imageUrl': string;
    'segments': Array<AutoLabelerSegment>;

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
            "name": "sample",
            "baseName": "sample",
            "type": "Sample"
        },
        {
            "name": "imageUrl",
            "baseName": "imageUrl",
            "type": "string"
        },
        {
            "name": "segments",
            "baseName": "segments",
            "type": "Array<AutoLabelerSegment>"
        }    ];

    static getAttributeTypeMap() {
        return GetAutoLabelerSegmentInfoResponse.attributeTypeMap;
    }
}

