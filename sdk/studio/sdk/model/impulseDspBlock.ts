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

import { ImpulseDspBlockNamedAxes } from './impulseDspBlockNamedAxes';
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
    /**
    * Named axes for the block
    */
    'namedAxes'?: Array<ImpulseDspBlockNamedAxes>;

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
        },
        {
            "name": "namedAxes",
            "baseName": "namedAxes",
            "type": "Array<ImpulseDspBlockNamedAxes>"
        }    ];

    static getAttributeTypeMap() {
        return ImpulseDspBlock.attributeTypeMap;
    }
}

