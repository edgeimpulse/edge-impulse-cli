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


export class ExportOriginalDataRequest {
    /**
    * Whether to rename the exported file names to an uploader friendly format (e.g. label.filename.cbor)
    */
    'uploaderFriendlyFilenames': boolean;
    /**
    * Whether to retain crops and splits (applicable to time-series data only). If this is disabled, then the original files are returned (as they were uploaded).
    */
    'retainCrops': boolean;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "uploaderFriendlyFilenames",
            "baseName": "uploaderFriendlyFilenames",
            "type": "boolean"
        },
        {
            "name": "retainCrops",
            "baseName": "retainCrops",
            "type": "boolean"
        }    ];

    static getAttributeTypeMap() {
        return ExportOriginalDataRequest.attributeTypeMap;
    }
}

