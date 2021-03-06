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


export class GetJWTTokenRequest {
    /**
    * Username or e-mail address
    */
    'username': string;
    /**
    * Password
    */
    'password': string;
    /**
    * Evaluation user UUID
    */
    'uuid'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "username",
            "baseName": "username",
            "type": "string"
        },
        {
            "name": "password",
            "baseName": "password",
            "type": "string"
        },
        {
            "name": "uuid",
            "baseName": "uuid",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return GetJWTTokenRequest.attributeTypeMap;
    }
}

