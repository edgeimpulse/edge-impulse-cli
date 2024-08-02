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


export class CreateNewEmptyImpulseResponseAllOf {
    /**
    * ID of the new impulse
    */
    'id': number;
    /**
    * Link to redirect the user to afterwards
    */
    'redirectUrl': string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "redirectUrl",
            "baseName": "redirectUrl",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return CreateNewEmptyImpulseResponseAllOf.attributeTypeMap;
    }
}

