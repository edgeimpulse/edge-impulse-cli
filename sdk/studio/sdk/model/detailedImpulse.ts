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

import { CreatedUpdatedByUser } from './createdUpdatedByUser';
import { DetailedImpulseDspBlockConfigs } from './detailedImpulseDspBlockConfigs';
import { DetailedImpulseLearnBlockAnomalyConfigs } from './detailedImpulseLearnBlockAnomalyConfigs';
import { DetailedImpulseLearnBlockKerasConfigs } from './detailedImpulseLearnBlockKerasConfigs';
import { DetailedImpulseMetric } from './detailedImpulseMetric';
import { DetailedImpulsePretrainedModelInfo } from './detailedImpulsePretrainedModelInfo';
import { Impulse } from './impulse';

export class DetailedImpulse {
    'impulse': Impulse;
    'metrics': Array<DetailedImpulseMetric>;
    'dspBlockConfigs': Array<DetailedImpulseDspBlockConfigs>;
    'learnBlockKerasConfigs': Array<DetailedImpulseLearnBlockKerasConfigs>;
    'learnBlockAnomalyConfigs': Array<DetailedImpulseLearnBlockAnomalyConfigs>;
    'pretrainedModelInfo'?: DetailedImpulsePretrainedModelInfo;
    /**
    * Whether this impulse contains blocks with \"stale\" features (i.e. the dataset has changed since features were generated)
    */
    'isStale': boolean;
    /**
    * Whether this impulse is configured
    */
    'configured': boolean;
    /**
    * Whether this impulse is fully trained and configured
    */
    'complete': boolean;
    /**
    * Tags associated with this impulse
    */
    'tags': Array<string>;
    /**
    * The source EON Tuner trial ID for impulses created from the EON Tuner
    */
    'createdFromTunerTrialId'?: number;
    'createdByUser'?: CreatedUpdatedByUser;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "impulse",
            "baseName": "impulse",
            "type": "Impulse"
        },
        {
            "name": "metrics",
            "baseName": "metrics",
            "type": "Array<DetailedImpulseMetric>"
        },
        {
            "name": "dspBlockConfigs",
            "baseName": "dspBlockConfigs",
            "type": "Array<DetailedImpulseDspBlockConfigs>"
        },
        {
            "name": "learnBlockKerasConfigs",
            "baseName": "learnBlockKerasConfigs",
            "type": "Array<DetailedImpulseLearnBlockKerasConfigs>"
        },
        {
            "name": "learnBlockAnomalyConfigs",
            "baseName": "learnBlockAnomalyConfigs",
            "type": "Array<DetailedImpulseLearnBlockAnomalyConfigs>"
        },
        {
            "name": "pretrainedModelInfo",
            "baseName": "pretrainedModelInfo",
            "type": "DetailedImpulsePretrainedModelInfo"
        },
        {
            "name": "isStale",
            "baseName": "isStale",
            "type": "boolean"
        },
        {
            "name": "configured",
            "baseName": "configured",
            "type": "boolean"
        },
        {
            "name": "complete",
            "baseName": "complete",
            "type": "boolean"
        },
        {
            "name": "tags",
            "baseName": "tags",
            "type": "Array<string>"
        },
        {
            "name": "createdFromTunerTrialId",
            "baseName": "createdFromTunerTrialId",
            "type": "number"
        },
        {
            "name": "createdByUser",
            "baseName": "createdByUser",
            "type": "CreatedUpdatedByUser"
        }    ];

    static getAttributeTypeMap() {
        return DetailedImpulse.attributeTypeMap;
    }
}

