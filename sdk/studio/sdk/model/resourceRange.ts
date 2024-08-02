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
* Describes range of expected availability for an arbitrary resource
*/
export class ResourceRange {
    'minimum'?: number;
    'maximum'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "minimum",
            "baseName": "minimum",
            "type": "number"
        },
        {
            "name": "maximum",
            "baseName": "maximum",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return ResourceRange.attributeTypeMap;
    }
}

