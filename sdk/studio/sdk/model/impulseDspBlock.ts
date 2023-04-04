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

import { ImpulseDspBlockOrganization } from './impulseDspBlockOrganization';

export class ImpulseDspBlock {
    /**
    * Identifier for this block. Make sure to up this number when creating a new block, and don\'t re-use identifiers. If the block hasn\'t changed, keep the ID as-is. ID must be unique across the project and greather than zero (>0).
    */
    'id': number;
    /**
    * Block type
    */
    'type': string;
    /**
    * Block name, will be used in menus
    */
    'name': string;
    /**
    * Input axes, identified by the name in the name of the axis
    */
    'axes': Array<string>;
    /**
    * Block title, used in the impulse UI
    */
    'title': string;
    /**
    * Number of features this DSP block outputs per axis. This is only set when the DSP block is configured.
    */
    'valuesPerAxis'?: number;
    /**
    * The ID of the Input block a DSP block is connected to
    */
    'input'?: number;
    /**
    * Whether this block is the primary version of its base block.
    */
    'primaryVersion': boolean;
    /**
    * The version number of the original block this version was based on. If this is an original block, will be undefined.
    */
    'baseBlockId'?: number;
    /**
    * The version number of the original tuner block this version was based on. If this is an original tuner block, will be undefined
    */
    'tunerBaseBlockId'?: number;
    /**
    * The version number of the original tuner template block this version was based on. If this is an original tuner template block, will be undefined
    */
    'tunerTemplateId'?: number;
    /**
    * Specifies if this block was copied from a tuner block when a tuner model variant was set as primary model
    */
    'tunerPrimary'?: boolean;
    /**
    * ID of block this block version was cloned from
    */
    'clonedFromBlockId'?: number;
    /**
    * Specifies if this block was updated after being cloned/created
    */
    'mutated'?: boolean;
    /**
    * Whether is block is enabled. A block is assumed to be enabled when unset.
    */
    'enabled'?: boolean;
    /**
    * Whether block is stored in database.
    */
    'db'?: boolean;
    /**
    * A short description of the block version, displayed in the block versioning UI
    */
    'description'?: string;
    /**
    * The system component that created the block version (createImpulse | clone | tuner). Cannot be set via API.
    */
    'createdBy'?: string;
    /**
    * The datetime that the block version was created. Cannot be set via API.
    */
    'createdAt'?: Date;
    /**
    * Implementation version of the block
    */
    'implementationVersion': number;
    'organization'?: ImpulseDspBlockOrganization;
    /**
    * Required for type \'custom\'
    */
    'customUrl'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "type",
            "baseName": "type",
            "type": "string"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "axes",
            "baseName": "axes",
            "type": "Array<string>"
        },
        {
            "name": "title",
            "baseName": "title",
            "type": "string"
        },
        {
            "name": "valuesPerAxis",
            "baseName": "valuesPerAxis",
            "type": "number"
        },
        {
            "name": "input",
            "baseName": "input",
            "type": "number"
        },
        {
            "name": "primaryVersion",
            "baseName": "primaryVersion",
            "type": "boolean"
        },
        {
            "name": "baseBlockId",
            "baseName": "baseBlockId",
            "type": "number"
        },
        {
            "name": "tunerBaseBlockId",
            "baseName": "tunerBaseBlockId",
            "type": "number"
        },
        {
            "name": "tunerTemplateId",
            "baseName": "tunerTemplateId",
            "type": "number"
        },
        {
            "name": "tunerPrimary",
            "baseName": "tunerPrimary",
            "type": "boolean"
        },
        {
            "name": "clonedFromBlockId",
            "baseName": "clonedFromBlockId",
            "type": "number"
        },
        {
            "name": "mutated",
            "baseName": "mutated",
            "type": "boolean"
        },
        {
            "name": "enabled",
            "baseName": "enabled",
            "type": "boolean"
        },
        {
            "name": "db",
            "baseName": "db",
            "type": "boolean"
        },
        {
            "name": "description",
            "baseName": "description",
            "type": "string"
        },
        {
            "name": "createdBy",
            "baseName": "createdBy",
            "type": "string"
        },
        {
            "name": "createdAt",
            "baseName": "createdAt",
            "type": "Date"
        },
        {
            "name": "implementationVersion",
            "baseName": "implementationVersion",
            "type": "number"
        },
        {
            "name": "organization",
            "baseName": "organization",
            "type": "ImpulseDspBlockOrganization"
        },
        {
            "name": "customUrl",
            "baseName": "customUrl",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return ImpulseDspBlock.attributeTypeMap;
    }
}

