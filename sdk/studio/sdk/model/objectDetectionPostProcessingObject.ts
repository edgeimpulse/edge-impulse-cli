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


export class ObjectDetectionPostProcessingObject {
    'label': string;
    'x': number;
    'y': number;
    'width': number;
    'height': number;
    'score': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "label",
            "baseName": "label",
            "type": "string"
        },
        {
            "name": "x",
            "baseName": "x",
            "type": "number"
        },
        {
            "name": "y",
            "baseName": "y",
            "type": "number"
        },
        {
            "name": "width",
            "baseName": "width",
            "type": "number"
        },
        {
            "name": "height",
            "baseName": "height",
            "type": "number"
        },
        {
            "name": "score",
            "baseName": "score",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return ObjectDetectionPostProcessingObject.attributeTypeMap;
    }
}

