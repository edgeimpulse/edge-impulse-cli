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


export class TunerTrialDspJobId {
    'training'?: number;
    'testing'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "training",
            "baseName": "training",
            "type": "number"
        },
        {
            "name": "testing",
            "baseName": "testing",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return TunerTrialDspJobId.attributeTypeMap;
    }
}

