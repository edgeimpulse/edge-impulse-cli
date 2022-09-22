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

import { ObjectDetectionLastLayer } from './objectDetectionLastLayer';

export class OrganizationTransferLearningBlock {
    'id': number;
    'name': string;
    'dockerContainer': string;
    'dockerContainerManagedByEdgeImpulse': boolean;
    'created': Date;
    'description': string;
    'userId'?: number;
    'userName'?: string;
    'operatesOn': OrganizationTransferLearningBlockOperatesOnEnum;
    'objectDetectionLastLayer'?: ObjectDetectionLastLayer;
    'implementationVersion': number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "dockerContainer",
            "baseName": "dockerContainer",
            "type": "string"
        },
        {
            "name": "dockerContainerManagedByEdgeImpulse",
            "baseName": "dockerContainerManagedByEdgeImpulse",
            "type": "boolean"
        },
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "description",
            "baseName": "description",
            "type": "string"
        },
        {
            "name": "userId",
            "baseName": "userId",
            "type": "number"
        },
        {
            "name": "userName",
            "baseName": "userName",
            "type": "string"
        },
        {
            "name": "operatesOn",
            "baseName": "operatesOn",
            "type": "OrganizationTransferLearningBlockOperatesOnEnum"
        },
        {
            "name": "objectDetectionLastLayer",
            "baseName": "objectDetectionLastLayer",
            "type": "ObjectDetectionLastLayer"
        },
        {
            "name": "implementationVersion",
            "baseName": "implementationVersion",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return OrganizationTransferLearningBlock.attributeTypeMap;
    }
}


export type OrganizationTransferLearningBlockOperatesOnEnum = 'object_detection' | 'audio' | 'image' | 'regression' | 'other';
export const OrganizationTransferLearningBlockOperatesOnEnumValues: string[] = ['object_detection', 'audio', 'image', 'regression', 'other'];
