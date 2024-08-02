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

import { PortalFile } from './portalFile';

export class PreviewDefaultFilesInFolderResponseAllOf {
    'files': Array<PortalFile>;
    /**
    * True if results are truncated.
    */
    'isTruncated'?: boolean;
    /**
    * Explains why results are truncated; only present in the response if isTruncated is true. Results can be truncated if there are too many results (more than 500 matches), or if searching for more results is too expensive (for example, the dataset contains many items but very few match the given wildcard). 
    */
    'truncationReason'?: PreviewDefaultFilesInFolderResponseAllOfTruncationReasonEnum;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "files",
            "baseName": "files",
            "type": "Array<PortalFile>"
        },
        {
            "name": "isTruncated",
            "baseName": "isTruncated",
            "type": "boolean"
        },
        {
            "name": "truncationReason",
            "baseName": "truncationReason",
            "type": "PreviewDefaultFilesInFolderResponseAllOfTruncationReasonEnum"
        }    ];

    static getAttributeTypeMap() {
        return PreviewDefaultFilesInFolderResponseAllOf.attributeTypeMap;
    }
}


export type PreviewDefaultFilesInFolderResponseAllOfTruncationReasonEnum = 'too-many-results' | 'too-expensive-search';
export const PreviewDefaultFilesInFolderResponseAllOfTruncationReasonEnumValues: string[] = ['too-many-results', 'too-expensive-search'];
