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


export class GetDataExplorerFeaturesResponseAllOfSample {
    'id': number;
    'name': string;
    'startMs': number;
    'endMs': number;
    'category': GetDataExplorerFeaturesResponseAllOfSampleCategoryEnum;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "startMs",
            "baseName": "startMs",
            "type": "number"
        },
        {
            "name": "endMs",
            "baseName": "endMs",
            "type": "number"
        },
        {
            "name": "category",
            "baseName": "category",
            "type": "GetDataExplorerFeaturesResponseAllOfSampleCategoryEnum"
        }    ];

    static getAttributeTypeMap() {
        return GetDataExplorerFeaturesResponseAllOfSample.attributeTypeMap;
    }
}


export type GetDataExplorerFeaturesResponseAllOfSampleCategoryEnum = 'training' | 'testing';
export const GetDataExplorerFeaturesResponseAllOfSampleCategoryEnumValues: string[] = ['training', 'testing'];
