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

import { SampleProposedChanges } from './sampleProposedChanges';

export class AIActionLastPreviewStateProposedChanges {
    'sampleId': number;
    'step': number;
    'proposedChanges': SampleProposedChanges;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "sampleId",
            "baseName": "sampleId",
            "type": "number"
        },
        {
            "name": "step",
            "baseName": "step",
            "type": "number"
        },
        {
            "name": "proposedChanges",
            "baseName": "proposedChanges",
            "type": "SampleProposedChanges"
        }    ];

    static getAttributeTypeMap() {
        return AIActionLastPreviewStateProposedChanges.attributeTypeMap;
    }
}
