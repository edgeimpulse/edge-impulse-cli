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

import { BoundingBox } from './boundingBox';
import { Sensor } from './sensor';
import { StructuredLabel } from './structuredLabel';

export class Sample {
    'id': number;
    'filename': string;
    /**
    * Whether signature validation passed
    */
    'signatureValidate': boolean;
    'signatureMethod'?: string;
    /**
    * Either the shared key or the public key that was used to validate the sample
    */
    'signatureKey'?: string;
    /**
    * Timestamp when the sample was created on device, or if no accurate time was known on device, the time that the file was processed by the ingestion service.
    */
    'created': Date;
    /**
    * Timestamp when the sample was last modified.
    */
    'lastModified': Date;
    'category': string;
    'coldstorageFilename': string;
    'label': string;
    /**
    * Interval between two windows (1000 / frequency). If the data was resampled, then this lists the resampled interval.
    */
    'intervalMs': number;
    /**
    * Frequency of the sample. If the data was resampled, then this lists the resampled frequency.
    */
    'frequency': number;
    /**
    * Interval between two windows (1000 / frequency) in the source data (before resampling).
    */
    'originalIntervalMs': number;
    /**
    * Frequency of the sample in the source data (before resampling).
    */
    'originalFrequency': number;
    'deviceName'?: string;
    'deviceType': string;
    'sensors': Array<Sensor>;
    /**
    * Number of readings in this file
    */
    'valuesCount': number;
    /**
    * Total length (in ms.) of this file
    */
    'totalLengthMs'?: number;
    /**
    * Timestamp when the sample was added to the current acquisition bucket.
    */
    'added': Date;
    'boundingBoxes': Array<BoundingBox>;
    'boundingBoxesType': SampleBoundingBoxesTypeEnum;
    'chartType': SampleChartTypeEnum;
    'thumbnailVideo'?: string;
    'thumbnailVideoFull'?: string;
    /**
    * True if the current sample is excluded from use
    */
    'isDisabled': boolean;
    /**
    * True if the current sample is still processing (e.g. for video)
    */
    'isProcessing': boolean;
    /**
    * Set when sample is processing and a job has picked up the request
    */
    'processingJobId'?: number;
    /**
    * Set when processing this sample failed
    */
    'processingError': boolean;
    /**
    * Error (only set when processing this sample failed)
    */
    'processingErrorString'?: string;
    /**
    * Whether the sample is cropped from another sample (and has crop start / end info)
    */
    'isCropped': boolean;
    /**
    * Sample free form associated metadata
    */
    'metadata'?: { [key: string]: string; };
    /**
    * Unique identifier of the project this sample belongs to
    */
    'projectId': number;
    /**
    * Name of the owner of the project this sample belongs to
    */
    'projectOwnerName'?: string;
    /**
    * Name of the project this sample belongs to
    */
    'projectName'?: string;
    /**
    * What labeling flow the project this sample belongs to uses
    */
    'projectLabelingMethod'?: SampleProjectLabelingMethodEnum;
    /**
    * Data sample SHA 256 hash (including CBOR envelope if applicable)
    */
    'sha256Hash': string;
    'structuredLabels'?: Array<StructuredLabel>;
    'structuredLabelsList'?: Array<string>;
    /**
    * If this sample was created by a synthetic data job, it\'s referenced here.
    */
    'createdBySyntheticDataJobId'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "id",
            "baseName": "id",
            "type": "number"
        },
        {
            "name": "filename",
            "baseName": "filename",
            "type": "string"
        },
        {
            "name": "signatureValidate",
            "baseName": "signatureValidate",
            "type": "boolean"
        },
        {
            "name": "signatureMethod",
            "baseName": "signatureMethod",
            "type": "string"
        },
        {
            "name": "signatureKey",
            "baseName": "signatureKey",
            "type": "string"
        },
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "lastModified",
            "baseName": "lastModified",
            "type": "Date"
        },
        {
            "name": "category",
            "baseName": "category",
            "type": "string"
        },
        {
            "name": "coldstorageFilename",
            "baseName": "coldstorageFilename",
            "type": "string"
        },
        {
            "name": "label",
            "baseName": "label",
            "type": "string"
        },
        {
            "name": "intervalMs",
            "baseName": "intervalMs",
            "type": "number"
        },
        {
            "name": "frequency",
            "baseName": "frequency",
            "type": "number"
        },
        {
            "name": "originalIntervalMs",
            "baseName": "originalIntervalMs",
            "type": "number"
        },
        {
            "name": "originalFrequency",
            "baseName": "originalFrequency",
            "type": "number"
        },
        {
            "name": "deviceName",
            "baseName": "deviceName",
            "type": "string"
        },
        {
            "name": "deviceType",
            "baseName": "deviceType",
            "type": "string"
        },
        {
            "name": "sensors",
            "baseName": "sensors",
            "type": "Array<Sensor>"
        },
        {
            "name": "valuesCount",
            "baseName": "valuesCount",
            "type": "number"
        },
        {
            "name": "totalLengthMs",
            "baseName": "totalLengthMs",
            "type": "number"
        },
        {
            "name": "added",
            "baseName": "added",
            "type": "Date"
        },
        {
            "name": "boundingBoxes",
            "baseName": "boundingBoxes",
            "type": "Array<BoundingBox>"
        },
        {
            "name": "boundingBoxesType",
            "baseName": "boundingBoxesType",
            "type": "SampleBoundingBoxesTypeEnum"
        },
        {
            "name": "chartType",
            "baseName": "chartType",
            "type": "SampleChartTypeEnum"
        },
        {
            "name": "thumbnailVideo",
            "baseName": "thumbnailVideo",
            "type": "string"
        },
        {
            "name": "thumbnailVideoFull",
            "baseName": "thumbnailVideoFull",
            "type": "string"
        },
        {
            "name": "isDisabled",
            "baseName": "isDisabled",
            "type": "boolean"
        },
        {
            "name": "isProcessing",
            "baseName": "isProcessing",
            "type": "boolean"
        },
        {
            "name": "processingJobId",
            "baseName": "processingJobId",
            "type": "number"
        },
        {
            "name": "processingError",
            "baseName": "processingError",
            "type": "boolean"
        },
        {
            "name": "processingErrorString",
            "baseName": "processingErrorString",
            "type": "string"
        },
        {
            "name": "isCropped",
            "baseName": "isCropped",
            "type": "boolean"
        },
        {
            "name": "metadata",
            "baseName": "metadata",
            "type": "{ [key: string]: string; }"
        },
        {
            "name": "projectId",
            "baseName": "projectId",
            "type": "number"
        },
        {
            "name": "projectOwnerName",
            "baseName": "projectOwnerName",
            "type": "string"
        },
        {
            "name": "projectName",
            "baseName": "projectName",
            "type": "string"
        },
        {
            "name": "projectLabelingMethod",
            "baseName": "projectLabelingMethod",
            "type": "SampleProjectLabelingMethodEnum"
        },
        {
            "name": "sha256Hash",
            "baseName": "sha256Hash",
            "type": "string"
        },
        {
            "name": "structuredLabels",
            "baseName": "structuredLabels",
            "type": "Array<StructuredLabel>"
        },
        {
            "name": "structuredLabelsList",
            "baseName": "structuredLabelsList",
            "type": "Array<string>"
        },
        {
            "name": "createdBySyntheticDataJobId",
            "baseName": "createdBySyntheticDataJobId",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return Sample.attributeTypeMap;
    }
}


export type SampleBoundingBoxesTypeEnum = 'object_detection' | 'constrained_object_detection';
export const SampleBoundingBoxesTypeEnumValues: string[] = ['object_detection', 'constrained_object_detection'];

export type SampleChartTypeEnum = 'chart' | 'image' | 'video' | 'table';
export const SampleChartTypeEnumValues: string[] = ['chart', 'image', 'video', 'table'];

export type SampleProjectLabelingMethodEnum = 'single_label' | 'object_detection';
export const SampleProjectLabelingMethodEnumValues: string[] = ['single_label', 'object_detection'];
