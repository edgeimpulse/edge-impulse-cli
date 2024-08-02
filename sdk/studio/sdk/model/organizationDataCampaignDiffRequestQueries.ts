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


export class OrganizationDataCampaignDiffRequestQueries {
    'dataset': string;
    'query': string;
    /**
    * Which point in the graph was clicked (from \"graphs.values\")
    */
    'graphValueId': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "dataset",
            "baseName": "dataset",
            "type": "string"
        },
        {
            "name": "query",
            "baseName": "query",
            "type": "string"
        },
        {
            "name": "graphValueId",
            "baseName": "graphValueId",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return OrganizationDataCampaignDiffRequestQueries.attributeTypeMap;
    }
}

