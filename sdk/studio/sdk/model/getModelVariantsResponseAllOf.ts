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

import { ProjectModelVariant } from './projectModelVariant';

export class GetModelVariantsResponseAllOf {
    /**
    * All model variants relevant for all learn blocks in the project
    */
    'modelVariants': Array<ProjectModelVariant>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "modelVariants",
            "baseName": "modelVariants",
            "type": "Array<ProjectModelVariant>"
        }    ];

    static getAttributeTypeMap() {
        return GetModelVariantsResponseAllOf.attributeTypeMap;
    }
}
