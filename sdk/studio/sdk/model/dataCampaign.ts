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

import { DataCampaignLink } from './dataCampaignLink';
import { DataCampaignQuery } from './dataCampaignQuery';

export class DataCampaign {
    'id': number;
    'dataCampaignDashboardId': number;
    'created': Date;
    'name': string;
    'description': string;
    /**
    * List of user IDs that coordinate this campaign
    */
    'coordinatorUids': Array<number>;
    'logo'?: string;
    'queries': Array<DataCampaignQuery>;
    'links': Array<DataCampaignLink>;
    'datasets': Array<string>;
    'pipelineIds': Array<number>;
    'projectIds': Array<number>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "dataCampaignDashboardId",
            "baseName": "dataCampaignDashboardId",
            "type": "number"
        },
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
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
            "name": "coordinatorUids",
            "baseName": "coordinatorUids",
            "type": "Array<number>"
        },
        {
            "name": "logo",
            "baseName": "logo",
            "type": "string"
        },
        {
            "name": "queries",
            "baseName": "queries",
            "type": "Array<DataCampaignQuery>"
        },
        {
            "name": "links",
            "baseName": "links",
            "type": "Array<DataCampaignLink>"
        },
        {
            "name": "datasets",
            "baseName": "datasets",
            "type": "Array<string>"
        },
        {
            "name": "pipelineIds",
            "baseName": "pipelineIds",
            "type": "Array<number>"
        },
        {
            "name": "projectIds",
            "baseName": "projectIds",
            "type": "Array<number>"
        }    ];

    static getAttributeTypeMap() {
        return DataCampaign.attributeTypeMap;
    }
}

