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


/**
* Only fields set in this object will be updated.
*/
export class UpdateUserRequest {
    /**
    * New full name
    */
    'name'?: string;
    /**
    * New job title
    */
    'jobTitle'?: string;
    /**
    * New company name
    */
    'companyName'?: string;
    /**
    * Whether to show the Imagine 2022 banner
    */
    'showImagine2022'?: boolean;
    /**
    * List of user experiments
    */
    'experiments'?: Array<string>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "jobTitle",
            "baseName": "jobTitle",
            "type": "string"
        },
        {
            "name": "companyName",
            "baseName": "companyName",
            "type": "string"
        },
        {
            "name": "showImagine2022",
            "baseName": "showImagine2022",
            "type": "boolean"
        },
        {
            "name": "experiments",
            "baseName": "experiments",
            "type": "Array<string>"
        }    ];

    static getAttributeTypeMap() {
        return UpdateUserRequest.attributeTypeMap;
    }
}

