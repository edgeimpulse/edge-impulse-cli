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


export class LogStdoutResponseAllOfStdout {
    'created': Date;
    'data': string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "data",
            "baseName": "data",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return LogStdoutResponseAllOfStdout.attributeTypeMap;
    }
}

