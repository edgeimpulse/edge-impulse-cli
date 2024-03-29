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

import { OrganizationCreateProjectOutputDatasetPathRule } from './organizationCreateProjectOutputDatasetPathRule';
import { OrganizationCreateProjectPathFilter } from './organizationCreateProjectPathFilter';
import { ProjectVisibility } from './projectVisibility';

/**
* If uploadType is set to \'project\', either projectId, newProjectName or both projectApiKey and projectHmacKey are required. projectId and newProjectName are only available through JWT tokens. If uploadType is set to \'dataset\' then outputDatasetName can be set to \'\' to output in the same dataset, or set to a string to create (or append to) a new dataset.
*/
export class OrganizationCreateProjectRequest {
    'name': string;
    /**
    * Filter in SQL format, used for creating transformation jobs on clinical datasets
    */
    'filter'?: string;
    /**
    * Set of paths to apply the transformation to, used for creating transformation jobs on default datasets. This option is experimental and may change in the future.
    */
    'pathFilters'?: Array<OrganizationCreateProjectPathFilter>;
    'uploadType'?: OrganizationCreateProjectRequestUploadTypeEnum;
    'projectId'?: number;
    'projectVisibility'?: ProjectVisibility;
    'newProjectName'?: string;
    'projectApiKey'?: string;
    'projectHmacKey'?: string;
    'transformationBlockId'?: number;
    'builtinTransformationBlock'?: object;
    'category'?: OrganizationCreateProjectRequestCategoryEnum;
    'outputDatasetName'?: string;
    'outputDatasetBucketId'?: number;
    /**
    * Path of new dataset within the bucket; used only when creating a new dataset.
    */
    'outputDatasetBucketPath'?: string;
    /**
    * Path within the selected dataset to upload transformed files into. Used only when uploading into a default (non-clinical) dataset.
    */
    'outputPathInDataset'?: string;
    'outputDatasetPathRule'?: OrganizationCreateProjectOutputDatasetPathRule;
    'label'?: string;
    'emailRecipientUids'?: Array<number>;
    /**
    * Number of parallel jobs to start
    */
    'transformationParallel'?: number;
    /**
    * Optional extra arguments for this transformation block
    */
    'extraCliArguments'?: string;
    /**
    * List of custom parameters for this transformation job (see the list of parameters that the block exposes).
    */
    'parameters'?: { [key: string]: string; };

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "filter",
            "baseName": "filter",
            "type": "string"
        },
        {
            "name": "pathFilters",
            "baseName": "pathFilters",
            "type": "Array<OrganizationCreateProjectPathFilter>"
        },
        {
            "name": "uploadType",
            "baseName": "uploadType",
            "type": "OrganizationCreateProjectRequestUploadTypeEnum"
        },
        {
            "name": "projectId",
            "baseName": "projectId",
            "type": "number"
        },
        {
            "name": "projectVisibility",
            "baseName": "projectVisibility",
            "type": "ProjectVisibility"
        },
        {
            "name": "newProjectName",
            "baseName": "newProjectName",
            "type": "string"
        },
        {
            "name": "projectApiKey",
            "baseName": "projectApiKey",
            "type": "string"
        },
        {
            "name": "projectHmacKey",
            "baseName": "projectHmacKey",
            "type": "string"
        },
        {
            "name": "transformationBlockId",
            "baseName": "transformationBlockId",
            "type": "number"
        },
        {
            "name": "builtinTransformationBlock",
            "baseName": "builtinTransformationBlock",
            "type": "object"
        },
        {
            "name": "category",
            "baseName": "category",
            "type": "OrganizationCreateProjectRequestCategoryEnum"
        },
        {
            "name": "outputDatasetName",
            "baseName": "outputDatasetName",
            "type": "string"
        },
        {
            "name": "outputDatasetBucketId",
            "baseName": "outputDatasetBucketId",
            "type": "number"
        },
        {
            "name": "outputDatasetBucketPath",
            "baseName": "outputDatasetBucketPath",
            "type": "string"
        },
        {
            "name": "outputPathInDataset",
            "baseName": "outputPathInDataset",
            "type": "string"
        },
        {
            "name": "outputDatasetPathRule",
            "baseName": "outputDatasetPathRule",
            "type": "OrganizationCreateProjectOutputDatasetPathRule"
        },
        {
            "name": "label",
            "baseName": "label",
            "type": "string"
        },
        {
            "name": "emailRecipientUids",
            "baseName": "emailRecipientUids",
            "type": "Array<number>"
        },
        {
            "name": "transformationParallel",
            "baseName": "transformationParallel",
            "type": "number"
        },
        {
            "name": "extraCliArguments",
            "baseName": "extraCliArguments",
            "type": "string"
        },
        {
            "name": "parameters",
            "baseName": "parameters",
            "type": "{ [key: string]: string; }"
        }    ];

    static getAttributeTypeMap() {
        return OrganizationCreateProjectRequest.attributeTypeMap;
    }
}


export type OrganizationCreateProjectRequestUploadTypeEnum = 'project' | 'dataset';
export const OrganizationCreateProjectRequestUploadTypeEnumValues: string[] = ['project', 'dataset'];

export type OrganizationCreateProjectRequestCategoryEnum = 'training' | 'testing' | 'split';
export const OrganizationCreateProjectRequestCategoryEnumValues: string[] = ['training', 'testing', 'split'];
