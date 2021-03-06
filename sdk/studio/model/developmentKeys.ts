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


export class DevelopmentKeys {
    /**
    * API Key
    */
    'apiKey'?: string;
    /**
    * HMAC Key
    */
    'hmacKey'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "apiKey",
            "baseName": "apiKey",
            "type": "string"
        },
        {
            "name": "hmacKey",
            "baseName": "hmacKey",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return DevelopmentKeys.attributeTypeMap;
    }
}

