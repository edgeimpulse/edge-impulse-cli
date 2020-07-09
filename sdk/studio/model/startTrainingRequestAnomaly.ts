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


export class StartTrainingRequestAnomaly {
    /**
    * Which axes (indexes from DSP script) to include in the training set
    */
    'axes': Array<number>;
    /**
    * Number of clusters
    */
    'clusterCount': number;
    /**
    * Minimum confidence rating required before tagging as anomaly
    */
    'minimumConfidenceRating': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "axes",
            "baseName": "axes",
            "type": "Array<number>"
        },
        {
            "name": "clusterCount",
            "baseName": "clusterCount",
            "type": "number"
        },
        {
            "name": "minimumConfidenceRating",
            "baseName": "minimumConfidenceRating",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return StartTrainingRequestAnomaly.attributeTypeMap;
    }
}
