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


export class AutoLabelerSegment {
    'id': number;
    'maskUrl': string;
    'maskX': number;
    'maskY': number;
    'maskWidth': number;
    'maskHeight': number;
    'cluster': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "maskUrl",
            "baseName": "maskUrl",
            "type": "string"
        },
        {
            "name": "maskX",
            "baseName": "maskX",
            "type": "number"
        },
        {
            "name": "maskY",
            "baseName": "maskY",
            "type": "number"
        },
        {
            "name": "maskWidth",
            "baseName": "maskWidth",
            "type": "number"
        },
        {
            "name": "maskHeight",
            "baseName": "maskHeight",
            "type": "number"
        },
        {
            "name": "cluster",
            "baseName": "cluster",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return AutoLabelerSegment.attributeTypeMap;
    }
}

