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

import { DeploymentTarget } from './deploymentTarget';
import { DeploymentTargetBadge } from './deploymentTargetBadge';
import { DeploymentTargetEngine } from './deploymentTargetEngine';
import { DeploymentTargetVariant } from './deploymentTargetVariant';
import { ProjectDeploymentTargetAllOf } from './projectDeploymentTargetAllOf';

export class ProjectDeploymentTarget {
    'name': string;
    'description': string;
    'image': string;
    'imageClasses': string;
    'format': string;
    'latencyDevice'?: string;
    /**
    * Preferably use supportedEngines / preferredEngine
    */
    'hasEonCompiler': boolean;
    /**
    * Preferably use supportedEngines / preferredEngine
    */
    'hasTensorRT': boolean;
    /**
    * Preferably use supportedEngines / preferredEngine
    */
    'hasTensaiFlow': boolean;
    /**
    * Preferably use supportedEngines / preferredEngine
    */
    'hasDRPAI': boolean;
    /**
    * Preferably use supportedEngines / preferredEngine
    */
    'hasTIDL': boolean;
    /**
    * Preferably use supportedEngines / preferredEngine
    */
    'hasAkida': boolean;
    /**
    * Preferably use supportedEngines / preferredEngine
    */
    'hasMemryx': boolean;
    /**
    * Preferably use supportedEngines / preferredEngine
    */
    'hasStAton': boolean;
    /**
    * Preferably use supportedEngines / preferredEngine
    */
    'hasCevaNpn': boolean;
    'hideOptimizations': boolean;
    'badge'?: DeploymentTargetBadge;
    'uiSection': ProjectDeploymentTargetUiSectionEnum;
    'customDeployId'?: number;
    'integrateUrl'?: string;
    'ownerOrganizationName'?: string;
    'supportedEngines': Array<DeploymentTargetEngine>;
    'preferredEngine': DeploymentTargetEngine;
    'url'?: string;
    'docsUrl': string;
    'firmwareRepoUrl'?: string;
    'modelVariants': Array<DeploymentTargetVariant>;
    /**
    * Whether this deployment target is recommended for the project based on connected devices.
    */
    'recommendedForProject': boolean;
    /**
    * Whether this deployment target is disabled for the project based on various attributes of the project.
    */
    'disabledForProject': boolean;
    /**
    * If the deployment target is disabled for the project, this gives the reason why.
    */
    'reasonTargetDisabled'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "description",
            "baseName": "description",
            "type": "string"
        },
        {
            "name": "image",
            "baseName": "image",
            "type": "string"
        },
        {
            "name": "imageClasses",
            "baseName": "imageClasses",
            "type": "string"
        },
        {
            "name": "format",
            "baseName": "format",
            "type": "string"
        },
        {
            "name": "latencyDevice",
            "baseName": "latencyDevice",
            "type": "string"
        },
        {
            "name": "hasEonCompiler",
            "baseName": "hasEonCompiler",
            "type": "boolean"
        },
        {
            "name": "hasTensorRT",
            "baseName": "hasTensorRT",
            "type": "boolean"
        },
        {
            "name": "hasTensaiFlow",
            "baseName": "hasTensaiFlow",
            "type": "boolean"
        },
        {
            "name": "hasDRPAI",
            "baseName": "hasDRPAI",
            "type": "boolean"
        },
        {
            "name": "hasTIDL",
            "baseName": "hasTIDL",
            "type": "boolean"
        },
        {
            "name": "hasAkida",
            "baseName": "hasAkida",
            "type": "boolean"
        },
        {
            "name": "hasMemryx",
            "baseName": "hasMemryx",
            "type": "boolean"
        },
        {
            "name": "hasStAton",
            "baseName": "hasStAton",
            "type": "boolean"
        },
        {
            "name": "hasCevaNpn",
            "baseName": "hasCevaNpn",
            "type": "boolean"
        },
        {
            "name": "hideOptimizations",
            "baseName": "hideOptimizations",
            "type": "boolean"
        },
        {
            "name": "badge",
            "baseName": "badge",
            "type": "DeploymentTargetBadge"
        },
        {
            "name": "uiSection",
            "baseName": "uiSection",
            "type": "ProjectDeploymentTargetUiSectionEnum"
        },
        {
            "name": "customDeployId",
            "baseName": "customDeployId",
            "type": "number"
        },
        {
            "name": "integrateUrl",
            "baseName": "integrateUrl",
            "type": "string"
        },
        {
            "name": "ownerOrganizationName",
            "baseName": "ownerOrganizationName",
            "type": "string"
        },
        {
            "name": "supportedEngines",
            "baseName": "supportedEngines",
            "type": "Array<DeploymentTargetEngine>"
        },
        {
            "name": "preferredEngine",
            "baseName": "preferredEngine",
            "type": "DeploymentTargetEngine"
        },
        {
            "name": "url",
            "baseName": "url",
            "type": "string"
        },
        {
            "name": "docsUrl",
            "baseName": "docsUrl",
            "type": "string"
        },
        {
            "name": "firmwareRepoUrl",
            "baseName": "firmwareRepoUrl",
            "type": "string"
        },
        {
            "name": "modelVariants",
            "baseName": "modelVariants",
            "type": "Array<DeploymentTargetVariant>"
        },
        {
            "name": "recommendedForProject",
            "baseName": "recommendedForProject",
            "type": "boolean"
        },
        {
            "name": "disabledForProject",
            "baseName": "disabledForProject",
            "type": "boolean"
        },
        {
            "name": "reasonTargetDisabled",
            "baseName": "reasonTargetDisabled",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return ProjectDeploymentTarget.attributeTypeMap;
    }
}


export type ProjectDeploymentTargetUiSectionEnum = 'library' | 'firmware' | 'mobile' | 'hidden';
export const ProjectDeploymentTargetUiSectionEnumValues: string[] = ['library', 'firmware', 'mobile', 'hidden'];
