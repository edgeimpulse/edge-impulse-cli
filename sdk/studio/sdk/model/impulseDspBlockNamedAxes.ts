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


export class ImpulseDspBlockNamedAxes {
    /**
    * Name of the axis
    */
    'name': string;
    /**
    * Description of the axis
    */
    'description'?: string;
    /**
    * Whether the axis is required
    */
    'required'?: boolean;
    /**
    * The selected axis for the block
    */
    'selectedAxis'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "description",
            "baseName": "description",
            "type": "string"
        },
        {
            "name": "required",
            "baseName": "required",
            "type": "boolean"
        },
        {
            "name": "selectedAxis",
            "baseName": "selectedAxis",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return ImpulseDspBlockNamedAxes.attributeTypeMap;
    }
}

