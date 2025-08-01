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

import { AdminStartEnterpriseTrialRequestAllOf } from './adminStartEnterpriseTrialRequestAllOf';
import { StartEnterpriseTrialRequest } from './startEnterpriseTrialRequest';

export class AdminStartEnterpriseTrialRequest {
    /**
    * Email of the user requesting the trial. If this email is different to the one stored for the user requesting the trial, it will be used to replace the existing one.
    */
    'email'?: string;
    /**
    * Name of the user requesting the trial. If this name is different to the one stored for the user requesting the trial, it will be used to replace the existing one.
    */
    'name'?: string;
    /**
    * Name of the trial organization. All enterprise features are tied to an organization. This organization will be deleted after the trial ends. If no organization name is provided, the user\'s name will be used.
    */
    'organizationName'?: string;
    /**
    * Expiration date of the trial. The trial will be set as expired after this date. There will be a grace period of 30 days after a trial expires before fully deleting the trial organization. This field is ignored if the trial is requested by a non-admin user, defaulting to 14 days trial.
    */
    'expirationDate'?: Date;
    /**
    * Notes about the trial. Free form text. This field is ignored if the trial is requested by a non-admin user.
    */
    'notes'?: string;
    /**
    * Use case of the trial.
    */
    'useCase'?: string;
    /**
    * Whether the user has ML models in production.
    */
    'userHasMLModelsInProduction'?: AdminStartEnterpriseTrialRequestUserHasMLModelsInProductionEnum;
    /**
    * Name of the company requesting the trial.
    */
    'companyName'?: string;
    /**
    * Size of the company requesting the trial. This is a range of number of employees.
    */
    'companySize'?: string;
    /**
    * Country of the company requesting the trial.
    */
    'country'?: string;
    /**
    * State or province of the company requesting the trial.
    */
    'stateOrProvince'?: string;
    /**
    * Origin of the redirect URL returned as result of creating the trial user.
    */
    'redirectUrlOrigin'?: string;
    /**
    * Query parameters to be appended to the redirect URL returned as result of creating the trial user.
    */
    'redirectUrlQueryParams'?: string;
    /**
    * ID of the user requesting the trial.
    */
    'userId': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "email",
            "baseName": "email",
            "type": "string"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "organizationName",
            "baseName": "organizationName",
            "type": "string"
        },
        {
            "name": "expirationDate",
            "baseName": "expirationDate",
            "type": "Date"
        },
        {
            "name": "notes",
            "baseName": "notes",
            "type": "string"
        },
        {
            "name": "useCase",
            "baseName": "useCase",
            "type": "string"
        },
        {
            "name": "userHasMLModelsInProduction",
            "baseName": "userHasMLModelsInProduction",
            "type": "AdminStartEnterpriseTrialRequestUserHasMLModelsInProductionEnum"
        },
        {
            "name": "companyName",
            "baseName": "companyName",
            "type": "string"
        },
        {
            "name": "companySize",
            "baseName": "companySize",
            "type": "string"
        },
        {
            "name": "country",
            "baseName": "country",
            "type": "string"
        },
        {
            "name": "stateOrProvince",
            "baseName": "stateOrProvince",
            "type": "string"
        },
        {
            "name": "redirectUrlOrigin",
            "baseName": "redirectUrlOrigin",
            "type": "string"
        },
        {
            "name": "redirectUrlQueryParams",
            "baseName": "redirectUrlQueryParams",
            "type": "string"
        },
        {
            "name": "userId",
            "baseName": "userId",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return AdminStartEnterpriseTrialRequest.attributeTypeMap;
    }
}


export type AdminStartEnterpriseTrialRequestUserHasMLModelsInProductionEnum = 'yes' | 'no' | 'no, but we will soon';
export const AdminStartEnterpriseTrialRequestUserHasMLModelsInProductionEnumValues: string[] = ['yes', 'no', 'no, but we will soon'];
