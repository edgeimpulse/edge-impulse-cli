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


export class PerformanceCalibrationParametersStandard {
    /**
    * The length of the averaging window in milliseconds.
    */
    'averageWindowDurationMs': number;
    /**
    * The minimum threshold for detection, from 0-1.
    */
    'detectionThreshold': number;
    /**
    * The amount of time new matches will be ignored after a positive result.
    */
    'suppressionMs': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "averageWindowDurationMs",
            "baseName": "averageWindowDurationMs",
            "type": "number"
        },
        {
            "name": "detectionThreshold",
            "baseName": "detectionThreshold",
            "type": "number"
        },
        {
            "name": "suppressionMs",
            "baseName": "suppressionMs",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return PerformanceCalibrationParametersStandard.attributeTypeMap;
    }
}

