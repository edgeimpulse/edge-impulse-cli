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

import { OrganizationPipelineFeedingIntoDataset } from './organizationPipelineFeedingIntoDataset';
import { OrganizationPipelineFeedingIntoProject } from './organizationPipelineFeedingIntoProject';
import { OrganizationPipelineRun } from './organizationPipelineRun';
import { OrganizationPipelineStep } from './organizationPipelineStep';

export class OrganizationPipeline {
    'id': number;
    'name': string;
    'description': string;
    /**
    * 15m for every 15 minutes, 2h for every 2 hours, 1d for every 1 day
    */
    'intervalStr'?: string;
    'steps': Array<OrganizationPipelineStep>;
    'nextRun'?: Date;
    'created': Date;
    'currentRun'?: OrganizationPipelineRun;
    'lastRun'?: OrganizationPipelineRun;
    'feedingIntoDataset'?: OrganizationPipelineFeedingIntoDataset;
    'feedingIntoProject'?: OrganizationPipelineFeedingIntoProject;
    'emailRecipientUids': Array<number>;
    'lastRunStartError'?: string;
    'notificationWebhook'?: string;
    'whenToEmail': OrganizationPipelineWhenToEmailEnum;

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
            "name": "description",
            "baseName": "description",
            "type": "string"
        },
        {
            "name": "intervalStr",
            "baseName": "intervalStr",
            "type": "string"
        },
        {
            "name": "steps",
            "baseName": "steps",
            "type": "Array<OrganizationPipelineStep>"
        },
        {
            "name": "nextRun",
            "baseName": "nextRun",
            "type": "Date"
        },
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "currentRun",
            "baseName": "currentRun",
            "type": "OrganizationPipelineRun"
        },
        {
            "name": "lastRun",
            "baseName": "lastRun",
            "type": "OrganizationPipelineRun"
        },
        {
            "name": "feedingIntoDataset",
            "baseName": "feedingIntoDataset",
            "type": "OrganizationPipelineFeedingIntoDataset"
        },
        {
            "name": "feedingIntoProject",
            "baseName": "feedingIntoProject",
            "type": "OrganizationPipelineFeedingIntoProject"
        },
        {
            "name": "emailRecipientUids",
            "baseName": "emailRecipientUids",
            "type": "Array<number>"
        },
        {
            "name": "lastRunStartError",
            "baseName": "lastRunStartError",
            "type": "string"
        },
        {
            "name": "notificationWebhook",
            "baseName": "notificationWebhook",
            "type": "string"
        },
        {
            "name": "whenToEmail",
            "baseName": "whenToEmail",
            "type": "OrganizationPipelineWhenToEmailEnum"
        }    ];

    static getAttributeTypeMap() {
        return OrganizationPipeline.attributeTypeMap;
    }
}


export type OrganizationPipelineWhenToEmailEnum = 'always' | 'on_new_data' | 'never';
export const OrganizationPipelineWhenToEmailEnumValues: string[] = ['always', 'on_new_data', 'never'];
