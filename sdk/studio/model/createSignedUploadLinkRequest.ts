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


export class CreateSignedUploadLinkRequest {
    /**
    * file name
    */
    'fileName': string;
    /**
    * file size in bytes
    */
    'fileSize': number;
    /**
    * hash to identify file changes
    */
    'fileHash': string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "fileName",
            "baseName": "fileName",
            "type": "string"
        },
        {
            "name": "fileSize",
            "baseName": "fileSize",
            "type": "number"
        },
        {
            "name": "fileHash",
            "baseName": "fileHash",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return CreateSignedUploadLinkRequest.attributeTypeMap;
    }
}

