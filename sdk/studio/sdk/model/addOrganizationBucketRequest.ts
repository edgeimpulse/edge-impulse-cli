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

import { StorageProvider } from './storageProvider';

export class AddOrganizationBucketRequest {
    /**
    * Access key for the storage service (e.g., S3 access key, GCS access key)
    */
    'accessKey': string;
    /**
    * Secret key for the storage service (e.g., S3 secret key, GCS secret key)
    */
    'secretKey': string;
    /**
    * Endpoint URL for the storage service (e.g., S3 endpoint, custom endpoint for other services) 
    */
    'endpoint': string;
    /**
    * Name of the storage bucket
    */
    'bucket': string;
    /**
    * Region of the storage service (if applicable)
    */
    'region': string;
    /**
    * Set this if you don\'t have access to the root of this bucket. Only used to verify connectivity to this bucket. 
    */
    'checkConnectivityPrefix'?: string;
    'storageProvider'?: StorageProvider;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "accessKey",
            "baseName": "accessKey",
            "type": "string"
        },
        {
            "name": "secretKey",
            "baseName": "secretKey",
            "type": "string"
        },
        {
            "name": "endpoint",
            "baseName": "endpoint",
            "type": "string"
        },
        {
            "name": "bucket",
            "baseName": "bucket",
            "type": "string"
        },
        {
            "name": "region",
            "baseName": "region",
            "type": "string"
        },
        {
            "name": "checkConnectivityPrefix",
            "baseName": "checkConnectivityPrefix",
            "type": "string"
        },
        {
            "name": "storageProvider",
            "baseName": "storageProvider",
            "type": "StorageProvider"
        }    ];

    static getAttributeTypeMap() {
        return AddOrganizationBucketRequest.attributeTypeMap;
    }
}

