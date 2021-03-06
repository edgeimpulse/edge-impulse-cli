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


export class StartSamplingRequest {
    /**
    * Label to be used during sampling.
    */
    'label': string;
    /**
    * Requested length of the sample (in ms).
    */
    'lengthMs': number;
    /**
    * Which acquisition category to sample data into.
    */
    'category': StartSamplingRequestCategoryEnum;
    /**
    * Interval between samples (can be calculated like `1/hz * 1000`)
    */
    'intervalMs': number;
    /**
    * The sensor to sample from.
    */
    'sensor'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "label",
            "baseName": "label",
            "type": "string"
        },
        {
            "name": "lengthMs",
            "baseName": "lengthMs",
            "type": "number"
        },
        {
            "name": "category",
            "baseName": "category",
            "type": "StartSamplingRequestCategoryEnum"
        },
        {
            "name": "intervalMs",
            "baseName": "intervalMs",
            "type": "number"
        },
        {
            "name": "sensor",
            "baseName": "sensor",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return StartSamplingRequest.attributeTypeMap;
    }
}


export type StartSamplingRequestCategoryEnum = 'training' | 'testing' | 'anomaly';
export const StartSamplingRequestCategoryEnumValues: string[] = ['training', 'testing', 'anomaly'];
