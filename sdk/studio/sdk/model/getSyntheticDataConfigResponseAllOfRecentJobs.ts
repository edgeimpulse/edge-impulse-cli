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

import { Job } from './job';
import { Sample } from './sample';

export class GetSyntheticDataConfigResponseAllOfRecentJobs {
    'job': Job;
    'samples': Array<Sample>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "job",
            "baseName": "job",
            "type": "Job"
        },
        {
            "name": "samples",
            "baseName": "samples",
            "type": "Array<Sample>"
        }    ];

    static getAttributeTypeMap() {
        return GetSyntheticDataConfigResponseAllOfRecentJobs.attributeTypeMap;
    }
}

