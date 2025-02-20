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


export class AddApiKeyRequest {
    /**
    * Description of the key
    */
    'name': string;
    /**
    * Optional: API key. This needs to start with `ei_` and will need to be at least 32 characters long. If this field is not passed in, a new API key is generated for you.
    */
    'apiKey'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "apiKey",
            "baseName": "apiKey",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return AddApiKeyRequest.attributeTypeMap;
    }
}

