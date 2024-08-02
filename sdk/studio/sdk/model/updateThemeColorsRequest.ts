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


/**
* Only fields set in this object will be updated.
*/
export class UpdateThemeColorsRequest {
    /**
    * Primary color in hex format
    */
    'primaryColor'?: string;
    /**
    * Primary color gradient end in hex format
    */
    'primaryColorGradientEnd'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "primaryColor",
            "baseName": "primaryColor",
            "type": "string"
        },
        {
            "name": "primaryColorGradientEnd",
            "baseName": "primaryColorGradientEnd",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return UpdateThemeColorsRequest.attributeTypeMap;
    }
}

