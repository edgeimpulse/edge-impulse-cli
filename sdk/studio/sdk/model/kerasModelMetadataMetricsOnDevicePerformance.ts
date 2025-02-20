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

import { KerasCustomMetric } from './kerasCustomMetric';
import { KerasModelMetadataMetricsTflite } from './kerasModelMetadataMetricsTflite';

export class KerasModelMetadataMetricsOnDevicePerformance {
    'mcu': string;
    'name': string;
    'isDefault': boolean;
    'latency': number;
    'tflite': KerasModelMetadataMetricsTflite;
    'eon': KerasModelMetadataMetricsTflite;
    'eonRamOptimized'?: KerasModelMetadataMetricsTflite;
    /**
    * Custom, device-specific performance metrics
    */
    'customMetrics'?: Array<KerasCustomMetric>;
    /**
    * If false, then no metrics are available for this target
    */
    'hasPerformance': boolean;
    /**
    * Specific error during profiling (e.g. model not supported)
    */
    'profilingError'?: string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "mcu",
            "baseName": "mcu",
            "type": "string"
        },
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "isDefault",
            "baseName": "isDefault",
            "type": "boolean"
        },
        {
            "name": "latency",
            "baseName": "latency",
            "type": "number"
        },
        {
            "name": "tflite",
            "baseName": "tflite",
            "type": "KerasModelMetadataMetricsTflite"
        },
        {
            "name": "eon",
            "baseName": "eon",
            "type": "KerasModelMetadataMetricsTflite"
        },
        {
            "name": "eonRamOptimized",
            "baseName": "eon_ram_optimized",
            "type": "KerasModelMetadataMetricsTflite"
        },
        {
            "name": "customMetrics",
            "baseName": "customMetrics",
            "type": "Array<KerasCustomMetric>"
        },
        {
            "name": "hasPerformance",
            "baseName": "hasPerformance",
            "type": "boolean"
        },
        {
            "name": "profilingError",
            "baseName": "profilingError",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return KerasModelMetadataMetricsOnDevicePerformance.attributeTypeMap;
    }
}

