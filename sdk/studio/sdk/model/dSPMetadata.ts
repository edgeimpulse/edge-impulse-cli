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

import { DSPMetadataIncludedSamples } from './dSPMetadataIncludedSamples';
import { DSPMetadataOutputConfig } from './dSPMetadataOutputConfig';

export class DSPMetadata {
    /**
    * Date when the features were created
    */
    'created': Date;
    'dspConfig': { [key: string]: string; };
    /**
    * Labels in the dataset when generator ran
    */
    'labels': Array<string>;
    /**
    * Names of the generated features. Only set if axes have explicit labels.
    */
    'featureLabels'?: Array<string>;
    'windowCount': number;
    /**
    * Number of features for this DSP block
    */
    'featureCount': number;
    /**
    * The included samples in this DSP block. Note that these are sorted in the same way as the `npy` files are laid out. So with the `windowCount` parameter you can exactly search back to see which file contributed to which windows there.
    */
    'includedSamples': Array<DSPMetadataIncludedSamples>;
    /**
    * Length of the sliding window when generating features.
    */
    'windowSizeMs': number;
    /**
    * Increase of the sliding window when generating features.
    */
    'windowIncreaseMs': number;
    /**
    * Whether data was zero-padded when generating features.
    */
    'padZeros': boolean;
    /**
    * Frequency of the original data in Hz.
    */
    'frequency': number;
    'outputConfig': DSPMetadataOutputConfig;
    'fftUsed'?: Array<number>;
    /**
    * The version number of the resampling algorithm used (for resampled time series data only)
    */
    'resamplingAlgorithmVersion'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "created",
            "baseName": "created",
            "type": "Date"
        },
        {
            "name": "dspConfig",
            "baseName": "dspConfig",
            "type": "{ [key: string]: string; }"
        },
        {
            "name": "labels",
            "baseName": "labels",
            "type": "Array<string>"
        },
        {
            "name": "featureLabels",
            "baseName": "featureLabels",
            "type": "Array<string>"
        },
        {
            "name": "windowCount",
            "baseName": "windowCount",
            "type": "number"
        },
        {
            "name": "featureCount",
            "baseName": "featureCount",
            "type": "number"
        },
        {
            "name": "includedSamples",
            "baseName": "includedSamples",
            "type": "Array<DSPMetadataIncludedSamples>"
        },
        {
            "name": "windowSizeMs",
            "baseName": "windowSizeMs",
            "type": "number"
        },
        {
            "name": "windowIncreaseMs",
            "baseName": "windowIncreaseMs",
            "type": "number"
        },
        {
            "name": "padZeros",
            "baseName": "padZeros",
            "type": "boolean"
        },
        {
            "name": "frequency",
            "baseName": "frequency",
            "type": "number"
        },
        {
            "name": "outputConfig",
            "baseName": "outputConfig",
            "type": "DSPMetadataOutputConfig"
        },
        {
            "name": "fftUsed",
            "baseName": "fftUsed",
            "type": "Array<number>"
        },
        {
            "name": "resamplingAlgorithmVersion",
            "baseName": "resamplingAlgorithmVersion",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return DSPMetadata.attributeTypeMap;
    }
}

