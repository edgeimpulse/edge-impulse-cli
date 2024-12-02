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

import { VerifyOrganizationBucketResponseAllOfFiles } from './verifyOrganizationBucketResponseAllOfFiles';

export class VerifyOrganizationBucketResponseAllOf {
    /**
    * Indicates the current state of the connectivity verification process. - \"connected\": Verification successful, other properties are available. - \"connecting\": Verification in progress, continue polling. - \"error\": Verification failed, check connectionError for details. 
    */
    'connectionStatus': VerifyOrganizationBucketResponseAllOfConnectionStatusEnum;
    /**
    * Provides additional details if connectionStatus is \"error\". Helps diagnose verification failures. 
    */
    'connectionError'?: string | null;
    /**
    * Timestamp of when the connectionStatus last changed. 
    */
    'connectionStatusSince'?: Date | null;
    /**
    * Random files from the bucket. Only available when connectionStatus is \"connected\".
    */
    'files'?: Array<VerifyOrganizationBucketResponseAllOfFiles>;
    /**
    * Indicates whether there are any info.labels files in this bucket. If so, those are used for category/labels. Only available when connectionStatus is \"connected\". 
    */
    'hasInfoLabelsFile'?: boolean;
    /**
    * A signed URL that allows you to PUT an item, to check whether CORS headers are set up correctly for this bucket. Only available when connectionStatus is \"connected\". 
    */
    'signedUrl'?: string;
    /**
    * An alternative endpoint URL. Only returned and required for Azure storage accounts, where the endpoint must be reformatted. This field will be undefined for other storage providers. 
    */
    'endpoint'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "connectionStatus",
            "baseName": "connectionStatus",
            "type": "VerifyOrganizationBucketResponseAllOfConnectionStatusEnum"
        },
        {
            "name": "connectionError",
            "baseName": "connectionError",
            "type": "string"
        },
        {
            "name": "connectionStatusSince",
            "baseName": "connectionStatusSince",
            "type": "Date"
        },
        {
            "name": "files",
            "baseName": "files",
            "type": "Array<VerifyOrganizationBucketResponseAllOfFiles>"
        },
        {
            "name": "hasInfoLabelsFile",
            "baseName": "hasInfoLabelsFile",
            "type": "boolean"
        },
        {
            "name": "signedUrl",
            "baseName": "signedUrl",
            "type": "string"
        },
        {
            "name": "endpoint",
            "baseName": "endpoint",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return VerifyOrganizationBucketResponseAllOf.attributeTypeMap;
    }
}


export type VerifyOrganizationBucketResponseAllOfConnectionStatusEnum = 'connected' | 'connecting' | 'error';
export const VerifyOrganizationBucketResponseAllOfConnectionStatusEnumValues: string[] = ['connected', 'connecting', 'error'];
