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

import { AdminGetOauthClientsResponseAllOf } from './adminGetOauthClientsResponseAllOf';
import { GenericApiResponse } from './genericApiResponse';
import { OauthClient } from './oauthClient';

export class AdminGetOauthClientsResponse {
    /**
    * Whether the operation succeeded
    */
    'success': boolean;
    /**
    * Optional error description (set if \'success\' was false)
    */
    'error'?: string;
    'oauthClients': Array<OauthClient>;
    /**
    * Total number of OAuth clients in the system.
    */
    'totalCount'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "success",
            "baseName": "success",
            "type": "boolean"
        },
        {
            "name": "error",
            "baseName": "error",
            "type": "string"
        },
        {
            "name": "oauthClients",
            "baseName": "oauthClients",
            "type": "Array<OauthClient>"
        },
        {
            "name": "totalCount",
            "baseName": "totalCount",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return AdminGetOauthClientsResponse.attributeTypeMap;
    }
}

