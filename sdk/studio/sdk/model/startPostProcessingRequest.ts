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

import { KerasModelVariantEnum } from './kerasModelVariantEnum';

export class StartPostProcessingRequest {
    'variant': KerasModelVariantEnum;
    /**
    * Which dataset to use
    */
    'dataset': StartPostProcessingRequestDatasetEnum;
    /**
    * Which algorithm container to use
    */
    'algorithm': string;
    /**
    * Which evaluation container to use
    */
    'evaluation': string;
    /**
    * The population size for the genetic algorithm
    */
    'population'?: number;
    /**
    * The maximum number of generations for the genetic algorithm
    */
    'maxGenerations'?: number;
    /**
    * The tolerance for the design space
    */
    'designSpaceTolerance'?: number;
    /**
    * The tolerance for the objective space
    */
    'objectiveSpaceTolerance'?: number;
    /**
    * The number of generations the termination criteria are averaged across
    */
    'terminationPeriod'?: number;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "variant",
            "baseName": "variant",
            "type": "KerasModelVariantEnum"
        },
        {
            "name": "dataset",
            "baseName": "dataset",
            "type": "StartPostProcessingRequestDatasetEnum"
        },
        {
            "name": "algorithm",
            "baseName": "algorithm",
            "type": "string"
        },
        {
            "name": "evaluation",
            "baseName": "evaluation",
            "type": "string"
        },
        {
            "name": "population",
            "baseName": "population",
            "type": "number"
        },
        {
            "name": "maxGenerations",
            "baseName": "maxGenerations",
            "type": "number"
        },
        {
            "name": "designSpaceTolerance",
            "baseName": "designSpaceTolerance",
            "type": "number"
        },
        {
            "name": "objectiveSpaceTolerance",
            "baseName": "objectiveSpaceTolerance",
            "type": "number"
        },
        {
            "name": "terminationPeriod",
            "baseName": "terminationPeriod",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return StartPostProcessingRequest.attributeTypeMap;
    }
}


export type StartPostProcessingRequestDatasetEnum = 'training' | 'validation' | 'testing';
export const StartPostProcessingRequestDatasetEnumValues: string[] = ['training', 'validation', 'testing'];
