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
* Represents an entity (either an organization, a user or a project) that has been moved to the trash bin. The entity must have either an organizationId, a userId or a projectId, but not multiple of them. At least one of these IDs must be present. 
*/
export class TrashBinEntity {
    /**
    * The ID of the entity in the trash bin. This is not the same as the user, project or organization ID.
    */
    'id': number;
    /**
    * The ID of the organization in the trash bin. This should only be set if the entity is an organization (userId and projectId should be null in this case). 
    */
    'organizationId'?: number;
    /**
    * The ID of the user in the trash bin. This should only be set if the entity is a user (organizationId and projectId should be null in this case). 
    */
    'userId'?: number;
    /**
    * The ID of the project in the trash bin. This should only be set if the entity is a project (organizationId and userId should be null in this case). 
    */
    'projectId'?: number;
    /**
    * The name of the entity in the trash bin.
    */
    'name': string;
    /**
    * The timestamp when the entity was moved to the trash bin.
    */
    'deletedAt': Date;
    /**
    * The timestamp when the entity was permanently deleted.
    */
    'fullyDeletedAt'?: Date;
    /**
    * The email of the user that requested the deletion.
    */
    'deletionRequestedByUserEmail': string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "organizationId",
            "baseName": "organizationId",
            "type": "number"
        },
        {
            "name": "userId",
            "baseName": "userId",
            "type": "number"
        },
        {
            "name": "projectId",
            "baseName": "projectId",
            "type": "number"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "deletedAt",
            "baseName": "deletedAt",
            "type": "Date"
        },
        {
            "name": "fullyDeletedAt",
            "baseName": "fullyDeletedAt",
            "type": "Date"
        },
        {
            "name": "deletionRequestedByUserEmail",
            "baseName": "deletionRequestedByUserEmail",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return TrashBinEntity.attributeTypeMap;
    }
}

