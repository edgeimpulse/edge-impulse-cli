export * from './activateUserRequest';
export * from './addApiKeyRequest';
export * from './addCollaboratorRequest';
export * from './addHmacKeyRequest';
export * from './anomalyModelMetadata';
export * from './anomalyModelMetadataClusters';
export * from './anomalyModelMetadataResponse';
export * from './anomalyResponse';
export * from './anomalyResponseAllOf';
export * from './anomalyResponseAllOfAxes';
export * from './anomalyTrainedFeaturesResponse';
export * from './anomalyTrainedFeaturesResponseAllOf';
export * from './anomalyTrainedFeaturesResponseAllOfData';
export * from './buildOnDeviceModelRequest';
export * from './changePasswordRequest';
export * from './classifySampleResponse';
export * from './classifySampleResponseAllOf';
export * from './classifySampleResponseAllOfClassifications';
export * from './createDeviceRequest';
export * from './createProjectRequest';
export * from './createProjectResponse';
export * from './createProjectResponseAllOf';
export * from './createUserRequest';
export * from './dSPBlock';
export * from './dSPConfigRequest';
export * from './dSPConfigResponse';
export * from './dSPConfigResponseAllOf';
export * from './dSPGroup';
export * from './dSPGroupItem';
export * from './dSPGroupItemSelectOptions';
export * from './dSPInfo';
export * from './dSPInfoFeatures';
export * from './dSPMetadata';
export * from './dSPMetadataIncludedSamples';
export * from './dSPMetadataResponse';
export * from './dependencyData';
export * from './developmentKeys';
export * from './developmentKeysResponse';
export * from './device';
export * from './deviceNameResponse';
export * from './deviceNameResponseAllOf';
export * from './download';
export * from './dspFeatureLabelsResponse';
export * from './dspFeatureLabelsResponseAllOf';
export * from './dspRunGraph';
export * from './dspRunRequest';
export * from './dspRunResponse';
export * from './dspRunResponseAllOf';
export * from './dspSampleFeaturesResponse';
export * from './dspSampleFeaturesResponseAllOf';
export * from './dspSampleFeaturesResponseAllOfData';
export * from './dspTrainedFeaturesResponse';
export * from './dspTrainedFeaturesResponseAllOf';
export * from './dspTrainedFeaturesResponseAllOfData';
export * from './editSampleLabelRequest';
export * from './generateFeaturesRequest';
export * from './genericApiResponse';
export * from './getDeviceResponse';
export * from './getDeviceResponseAllOf';
export * from './getImpulseBlocksResponse';
export * from './getImpulseBlocksResponseAllOf';
export * from './getImpulseResponse';
export * from './getImpulseResponseAllOf';
export * from './getJWTTokenRequest';
export * from './getJWTTokenResponse';
export * from './getJWTTokenResponseAllOf';
export * from './getSampleResponse';
export * from './getUserResponse';
export * from './getUserResponseAllOf';
export * from './impulse';
export * from './impulseDspBlock';
export * from './impulseLearnBlock';
export * from './job';
export * from './jobSummaryResponse';
export * from './jobSummaryResponseAllOf';
export * from './jobSummaryResponseAllOfSummary';
export * from './kerasModelLayer';
export * from './kerasModelLayerInput';
export * from './kerasModelLayerOutput';
export * from './kerasModelMetadata';
export * from './kerasModelMetadataAllOf';
export * from './kerasModelMetadataAllOfMetrics';
export * from './kerasResponse';
export * from './kerasResponseAllOf';
export * from './kerasVisualLayer';
export * from './learnBlock';
export * from './listApiKeysResponse';
export * from './listApiKeysResponseAllOf';
export * from './listApiKeysResponseAllOfApiKeys';
export * from './listDevicesResponse';
export * from './listDevicesResponseAllOf';
export * from './listEmailResponse';
export * from './listEmailResponseAllOf';
export * from './listEmailResponseAllOfEmails';
export * from './listHmacKeysResponse';
export * from './listHmacKeysResponseAllOf';
export * from './listHmacKeysResponseAllOfHmacKeys';
export * from './listJobsResponse';
export * from './listJobsResponseAllOf';
export * from './listProjectsResponse';
export * from './listProjectsResponseAllOf';
export * from './listSamplesResponse';
export * from './listSamplesResponseAllOf';
export * from './loginResponse';
export * from './loginResponseAllOf';
export * from './moveRawDataRequest';
export * from './project';
export * from './projectDataSummary';
export * from './projectInfoResponse';
export * from './projectInfoResponseAllOf';
export * from './projectInfoResponseAllOfComputeTime';
export * from './projectInfoResponseAllOfImpulse';
export * from './rawSampleData';
export * from './rawSamplePayload';
export * from './removeCollaboratorRequest';
export * from './renameDeviceRequest';
export * from './renameSampleRequest';
export * from './requestResetPasswordRequest';
export * from './resetPasswordRequest';
export * from './sample';
export * from './sampleFeaturesRequest';
export * from './sensor';
export * from './setAnomalyParameterRequest';
export * from './setKerasParameterRequest';
export * from './startJobResponse';
export * from './startJobResponseAllOf';
export * from './startTrainingRequestAnomaly';
export * from './updateProjectRequest';
export * from './updateUserRequest';
export * from './uploadUserPhotoRequest';
export * from './uploadUserPhotoResponse';
export * from './uploadUserPhotoResponseAllOf';
export * from './user';
export * from './verifyResetPasswordRequest';

import localVarRequest = require('request');

import { ActivateUserRequest } from './activateUserRequest';
import { AddApiKeyRequest } from './addApiKeyRequest';
import { AddCollaboratorRequest } from './addCollaboratorRequest';
import { AddHmacKeyRequest } from './addHmacKeyRequest';
import { AnomalyModelMetadata } from './anomalyModelMetadata';
import { AnomalyModelMetadataClusters } from './anomalyModelMetadataClusters';
import { AnomalyModelMetadataResponse } from './anomalyModelMetadataResponse';
import { AnomalyResponse } from './anomalyResponse';
import { AnomalyResponseAllOf } from './anomalyResponseAllOf';
import { AnomalyResponseAllOfAxes } from './anomalyResponseAllOfAxes';
import { AnomalyTrainedFeaturesResponse } from './anomalyTrainedFeaturesResponse';
import { AnomalyTrainedFeaturesResponseAllOf } from './anomalyTrainedFeaturesResponseAllOf';
import { AnomalyTrainedFeaturesResponseAllOfData } from './anomalyTrainedFeaturesResponseAllOfData';
import { BuildOnDeviceModelRequest } from './buildOnDeviceModelRequest';
import { ChangePasswordRequest } from './changePasswordRequest';
import { ClassifySampleResponse } from './classifySampleResponse';
import { ClassifySampleResponseAllOf } from './classifySampleResponseAllOf';
import { ClassifySampleResponseAllOfClassifications } from './classifySampleResponseAllOfClassifications';
import { CreateDeviceRequest } from './createDeviceRequest';
import { CreateProjectRequest } from './createProjectRequest';
import { CreateProjectResponse } from './createProjectResponse';
import { CreateProjectResponseAllOf } from './createProjectResponseAllOf';
import { CreateUserRequest } from './createUserRequest';
import { DSPBlock } from './dSPBlock';
import { DSPConfigRequest } from './dSPConfigRequest';
import { DSPConfigResponse } from './dSPConfigResponse';
import { DSPConfigResponseAllOf } from './dSPConfigResponseAllOf';
import { DSPGroup } from './dSPGroup';
import { DSPGroupItem } from './dSPGroupItem';
import { DSPGroupItemSelectOptions } from './dSPGroupItemSelectOptions';
import { DSPInfo } from './dSPInfo';
import { DSPInfoFeatures } from './dSPInfoFeatures';
import { DSPMetadata } from './dSPMetadata';
import { DSPMetadataIncludedSamples } from './dSPMetadataIncludedSamples';
import { DSPMetadataResponse } from './dSPMetadataResponse';
import { DependencyData } from './dependencyData';
import { DevelopmentKeys } from './developmentKeys';
import { DevelopmentKeysResponse } from './developmentKeysResponse';
import { Device } from './device';
import { DeviceNameResponse } from './deviceNameResponse';
import { DeviceNameResponseAllOf } from './deviceNameResponseAllOf';
import { Download } from './download';
import { DspFeatureLabelsResponse } from './dspFeatureLabelsResponse';
import { DspFeatureLabelsResponseAllOf } from './dspFeatureLabelsResponseAllOf';
import { DspRunGraph } from './dspRunGraph';
import { DspRunRequest } from './dspRunRequest';
import { DspRunResponse } from './dspRunResponse';
import { DspRunResponseAllOf } from './dspRunResponseAllOf';
import { DspSampleFeaturesResponse } from './dspSampleFeaturesResponse';
import { DspSampleFeaturesResponseAllOf } from './dspSampleFeaturesResponseAllOf';
import { DspSampleFeaturesResponseAllOfData } from './dspSampleFeaturesResponseAllOfData';
import { DspTrainedFeaturesResponse } from './dspTrainedFeaturesResponse';
import { DspTrainedFeaturesResponseAllOf } from './dspTrainedFeaturesResponseAllOf';
import { DspTrainedFeaturesResponseAllOfData } from './dspTrainedFeaturesResponseAllOfData';
import { EditSampleLabelRequest } from './editSampleLabelRequest';
import { GenerateFeaturesRequest } from './generateFeaturesRequest';
import { GenericApiResponse } from './genericApiResponse';
import { GetDeviceResponse } from './getDeviceResponse';
import { GetDeviceResponseAllOf } from './getDeviceResponseAllOf';
import { GetImpulseBlocksResponse } from './getImpulseBlocksResponse';
import { GetImpulseBlocksResponseAllOf } from './getImpulseBlocksResponseAllOf';
import { GetImpulseResponse } from './getImpulseResponse';
import { GetImpulseResponseAllOf } from './getImpulseResponseAllOf';
import { GetJWTTokenRequest } from './getJWTTokenRequest';
import { GetJWTTokenResponse } from './getJWTTokenResponse';
import { GetJWTTokenResponseAllOf } from './getJWTTokenResponseAllOf';
import { GetSampleResponse } from './getSampleResponse';
import { GetUserResponse } from './getUserResponse';
import { GetUserResponseAllOf } from './getUserResponseAllOf';
import { Impulse } from './impulse';
import { ImpulseDspBlock } from './impulseDspBlock';
import { ImpulseLearnBlock } from './impulseLearnBlock';
import { Job } from './job';
import { JobSummaryResponse } from './jobSummaryResponse';
import { JobSummaryResponseAllOf } from './jobSummaryResponseAllOf';
import { JobSummaryResponseAllOfSummary } from './jobSummaryResponseAllOfSummary';
import { KerasModelLayer } from './kerasModelLayer';
import { KerasModelLayerInput } from './kerasModelLayerInput';
import { KerasModelLayerOutput } from './kerasModelLayerOutput';
import { KerasModelMetadata } from './kerasModelMetadata';
import { KerasModelMetadataAllOf } from './kerasModelMetadataAllOf';
import { KerasModelMetadataAllOfMetrics } from './kerasModelMetadataAllOfMetrics';
import { KerasResponse } from './kerasResponse';
import { KerasResponseAllOf } from './kerasResponseAllOf';
import { KerasVisualLayer } from './kerasVisualLayer';
import { LearnBlock } from './learnBlock';
import { ListApiKeysResponse } from './listApiKeysResponse';
import { ListApiKeysResponseAllOf } from './listApiKeysResponseAllOf';
import { ListApiKeysResponseAllOfApiKeys } from './listApiKeysResponseAllOfApiKeys';
import { ListDevicesResponse } from './listDevicesResponse';
import { ListDevicesResponseAllOf } from './listDevicesResponseAllOf';
import { ListEmailResponse } from './listEmailResponse';
import { ListEmailResponseAllOf } from './listEmailResponseAllOf';
import { ListEmailResponseAllOfEmails } from './listEmailResponseAllOfEmails';
import { ListHmacKeysResponse } from './listHmacKeysResponse';
import { ListHmacKeysResponseAllOf } from './listHmacKeysResponseAllOf';
import { ListHmacKeysResponseAllOfHmacKeys } from './listHmacKeysResponseAllOfHmacKeys';
import { ListJobsResponse } from './listJobsResponse';
import { ListJobsResponseAllOf } from './listJobsResponseAllOf';
import { ListProjectsResponse } from './listProjectsResponse';
import { ListProjectsResponseAllOf } from './listProjectsResponseAllOf';
import { ListSamplesResponse } from './listSamplesResponse';
import { ListSamplesResponseAllOf } from './listSamplesResponseAllOf';
import { LoginResponse } from './loginResponse';
import { LoginResponseAllOf } from './loginResponseAllOf';
import { MoveRawDataRequest } from './moveRawDataRequest';
import { Project } from './project';
import { ProjectDataSummary } from './projectDataSummary';
import { ProjectInfoResponse } from './projectInfoResponse';
import { ProjectInfoResponseAllOf } from './projectInfoResponseAllOf';
import { ProjectInfoResponseAllOfComputeTime } from './projectInfoResponseAllOfComputeTime';
import { ProjectInfoResponseAllOfImpulse } from './projectInfoResponseAllOfImpulse';
import { RawSampleData } from './rawSampleData';
import { RawSamplePayload } from './rawSamplePayload';
import { RemoveCollaboratorRequest } from './removeCollaboratorRequest';
import { RenameDeviceRequest } from './renameDeviceRequest';
import { RenameSampleRequest } from './renameSampleRequest';
import { RequestResetPasswordRequest } from './requestResetPasswordRequest';
import { ResetPasswordRequest } from './resetPasswordRequest';
import { Sample } from './sample';
import { SampleFeaturesRequest } from './sampleFeaturesRequest';
import { Sensor } from './sensor';
import { SetAnomalyParameterRequest } from './setAnomalyParameterRequest';
import { SetKerasParameterRequest } from './setKerasParameterRequest';
import { StartJobResponse } from './startJobResponse';
import { StartJobResponseAllOf } from './startJobResponseAllOf';
import { StartTrainingRequestAnomaly } from './startTrainingRequestAnomaly';
import { UpdateProjectRequest } from './updateProjectRequest';
import { UpdateUserRequest } from './updateUserRequest';
import { UploadUserPhotoRequest } from './uploadUserPhotoRequest';
import { UploadUserPhotoResponse } from './uploadUserPhotoResponse';
import { UploadUserPhotoResponseAllOf } from './uploadUserPhotoResponseAllOf';
import { User } from './user';
import { VerifyResetPasswordRequest } from './verifyResetPasswordRequest';

/* tslint:disable:no-unused-variable */
let primitives = [
                    "string",
                    "boolean",
                    "double",
                    "integer",
                    "long",
                    "float",
                    "number",
                    "any"
                 ];

let enumsMap: {[index: string]: any} = {
        "BuildOnDeviceModelRequest.EngineEnum": BuildOnDeviceModelRequest.EngineEnum,
        "KerasResponse.ModeEnum": KerasResponse.ModeEnum,
        "KerasResponseAllOf.ModeEnum": KerasResponseAllOf.ModeEnum,
        "KerasVisualLayer.TypeEnum": KerasVisualLayer.TypeEnum,
        "MoveRawDataRequest.NewCategoryEnum": MoveRawDataRequest.NewCategoryEnum,
        "SetKerasParameterRequest.ModeEnum": SetKerasParameterRequest.ModeEnum,
}

let typeMap: {[index: string]: any} = {
    "ActivateUserRequest": ActivateUserRequest,
    "AddApiKeyRequest": AddApiKeyRequest,
    "AddCollaboratorRequest": AddCollaboratorRequest,
    "AddHmacKeyRequest": AddHmacKeyRequest,
    "AnomalyModelMetadata": AnomalyModelMetadata,
    "AnomalyModelMetadataClusters": AnomalyModelMetadataClusters,
    "AnomalyModelMetadataResponse": AnomalyModelMetadataResponse,
    "AnomalyResponse": AnomalyResponse,
    "AnomalyResponseAllOf": AnomalyResponseAllOf,
    "AnomalyResponseAllOfAxes": AnomalyResponseAllOfAxes,
    "AnomalyTrainedFeaturesResponse": AnomalyTrainedFeaturesResponse,
    "AnomalyTrainedFeaturesResponseAllOf": AnomalyTrainedFeaturesResponseAllOf,
    "AnomalyTrainedFeaturesResponseAllOfData": AnomalyTrainedFeaturesResponseAllOfData,
    "BuildOnDeviceModelRequest": BuildOnDeviceModelRequest,
    "ChangePasswordRequest": ChangePasswordRequest,
    "ClassifySampleResponse": ClassifySampleResponse,
    "ClassifySampleResponseAllOf": ClassifySampleResponseAllOf,
    "ClassifySampleResponseAllOfClassifications": ClassifySampleResponseAllOfClassifications,
    "CreateDeviceRequest": CreateDeviceRequest,
    "CreateProjectRequest": CreateProjectRequest,
    "CreateProjectResponse": CreateProjectResponse,
    "CreateProjectResponseAllOf": CreateProjectResponseAllOf,
    "CreateUserRequest": CreateUserRequest,
    "DSPBlock": DSPBlock,
    "DSPConfigRequest": DSPConfigRequest,
    "DSPConfigResponse": DSPConfigResponse,
    "DSPConfigResponseAllOf": DSPConfigResponseAllOf,
    "DSPGroup": DSPGroup,
    "DSPGroupItem": DSPGroupItem,
    "DSPGroupItemSelectOptions": DSPGroupItemSelectOptions,
    "DSPInfo": DSPInfo,
    "DSPInfoFeatures": DSPInfoFeatures,
    "DSPMetadata": DSPMetadata,
    "DSPMetadataIncludedSamples": DSPMetadataIncludedSamples,
    "DSPMetadataResponse": DSPMetadataResponse,
    "DependencyData": DependencyData,
    "DevelopmentKeys": DevelopmentKeys,
    "DevelopmentKeysResponse": DevelopmentKeysResponse,
    "Device": Device,
    "DeviceNameResponse": DeviceNameResponse,
    "DeviceNameResponseAllOf": DeviceNameResponseAllOf,
    "Download": Download,
    "DspFeatureLabelsResponse": DspFeatureLabelsResponse,
    "DspFeatureLabelsResponseAllOf": DspFeatureLabelsResponseAllOf,
    "DspRunGraph": DspRunGraph,
    "DspRunRequest": DspRunRequest,
    "DspRunResponse": DspRunResponse,
    "DspRunResponseAllOf": DspRunResponseAllOf,
    "DspSampleFeaturesResponse": DspSampleFeaturesResponse,
    "DspSampleFeaturesResponseAllOf": DspSampleFeaturesResponseAllOf,
    "DspSampleFeaturesResponseAllOfData": DspSampleFeaturesResponseAllOfData,
    "DspTrainedFeaturesResponse": DspTrainedFeaturesResponse,
    "DspTrainedFeaturesResponseAllOf": DspTrainedFeaturesResponseAllOf,
    "DspTrainedFeaturesResponseAllOfData": DspTrainedFeaturesResponseAllOfData,
    "EditSampleLabelRequest": EditSampleLabelRequest,
    "GenerateFeaturesRequest": GenerateFeaturesRequest,
    "GenericApiResponse": GenericApiResponse,
    "GetDeviceResponse": GetDeviceResponse,
    "GetDeviceResponseAllOf": GetDeviceResponseAllOf,
    "GetImpulseBlocksResponse": GetImpulseBlocksResponse,
    "GetImpulseBlocksResponseAllOf": GetImpulseBlocksResponseAllOf,
    "GetImpulseResponse": GetImpulseResponse,
    "GetImpulseResponseAllOf": GetImpulseResponseAllOf,
    "GetJWTTokenRequest": GetJWTTokenRequest,
    "GetJWTTokenResponse": GetJWTTokenResponse,
    "GetJWTTokenResponseAllOf": GetJWTTokenResponseAllOf,
    "GetSampleResponse": GetSampleResponse,
    "GetUserResponse": GetUserResponse,
    "GetUserResponseAllOf": GetUserResponseAllOf,
    "Impulse": Impulse,
    "ImpulseDspBlock": ImpulseDspBlock,
    "ImpulseLearnBlock": ImpulseLearnBlock,
    "Job": Job,
    "JobSummaryResponse": JobSummaryResponse,
    "JobSummaryResponseAllOf": JobSummaryResponseAllOf,
    "JobSummaryResponseAllOfSummary": JobSummaryResponseAllOfSummary,
    "KerasModelLayer": KerasModelLayer,
    "KerasModelLayerInput": KerasModelLayerInput,
    "KerasModelLayerOutput": KerasModelLayerOutput,
    "KerasModelMetadata": KerasModelMetadata,
    "KerasModelMetadataAllOf": KerasModelMetadataAllOf,
    "KerasModelMetadataAllOfMetrics": KerasModelMetadataAllOfMetrics,
    "KerasResponse": KerasResponse,
    "KerasResponseAllOf": KerasResponseAllOf,
    "KerasVisualLayer": KerasVisualLayer,
    "LearnBlock": LearnBlock,
    "ListApiKeysResponse": ListApiKeysResponse,
    "ListApiKeysResponseAllOf": ListApiKeysResponseAllOf,
    "ListApiKeysResponseAllOfApiKeys": ListApiKeysResponseAllOfApiKeys,
    "ListDevicesResponse": ListDevicesResponse,
    "ListDevicesResponseAllOf": ListDevicesResponseAllOf,
    "ListEmailResponse": ListEmailResponse,
    "ListEmailResponseAllOf": ListEmailResponseAllOf,
    "ListEmailResponseAllOfEmails": ListEmailResponseAllOfEmails,
    "ListHmacKeysResponse": ListHmacKeysResponse,
    "ListHmacKeysResponseAllOf": ListHmacKeysResponseAllOf,
    "ListHmacKeysResponseAllOfHmacKeys": ListHmacKeysResponseAllOfHmacKeys,
    "ListJobsResponse": ListJobsResponse,
    "ListJobsResponseAllOf": ListJobsResponseAllOf,
    "ListProjectsResponse": ListProjectsResponse,
    "ListProjectsResponseAllOf": ListProjectsResponseAllOf,
    "ListSamplesResponse": ListSamplesResponse,
    "ListSamplesResponseAllOf": ListSamplesResponseAllOf,
    "LoginResponse": LoginResponse,
    "LoginResponseAllOf": LoginResponseAllOf,
    "MoveRawDataRequest": MoveRawDataRequest,
    "Project": Project,
    "ProjectDataSummary": ProjectDataSummary,
    "ProjectInfoResponse": ProjectInfoResponse,
    "ProjectInfoResponseAllOf": ProjectInfoResponseAllOf,
    "ProjectInfoResponseAllOfComputeTime": ProjectInfoResponseAllOfComputeTime,
    "ProjectInfoResponseAllOfImpulse": ProjectInfoResponseAllOfImpulse,
    "RawSampleData": RawSampleData,
    "RawSamplePayload": RawSamplePayload,
    "RemoveCollaboratorRequest": RemoveCollaboratorRequest,
    "RenameDeviceRequest": RenameDeviceRequest,
    "RenameSampleRequest": RenameSampleRequest,
    "RequestResetPasswordRequest": RequestResetPasswordRequest,
    "ResetPasswordRequest": ResetPasswordRequest,
    "Sample": Sample,
    "SampleFeaturesRequest": SampleFeaturesRequest,
    "Sensor": Sensor,
    "SetAnomalyParameterRequest": SetAnomalyParameterRequest,
    "SetKerasParameterRequest": SetKerasParameterRequest,
    "StartJobResponse": StartJobResponse,
    "StartJobResponseAllOf": StartJobResponseAllOf,
    "StartTrainingRequestAnomaly": StartTrainingRequestAnomaly,
    "UpdateProjectRequest": UpdateProjectRequest,
    "UpdateUserRequest": UpdateUserRequest,
    "UploadUserPhotoRequest": UploadUserPhotoRequest,
    "UploadUserPhotoResponse": UploadUserPhotoResponse,
    "UploadUserPhotoResponseAllOf": UploadUserPhotoResponseAllOf,
    "User": User,
    "VerifyResetPasswordRequest": VerifyResetPasswordRequest,
}

export class ObjectSerializer {
    public static findCorrectType(data: any, expectedType: string) {
        if (data == undefined) {
            return expectedType;
        } else if (primitives.indexOf(expectedType.toLowerCase()) !== -1) {
            return expectedType;
        } else if (expectedType === "Date") {
            return expectedType;
        } else {
            if (enumsMap[expectedType]) {
                return expectedType;
            }

            if (!typeMap[expectedType]) {
                return expectedType; // w/e we don't know the type
            }

            // Check the discriminator
            let discriminatorProperty = typeMap[expectedType].discriminator;
            if (discriminatorProperty == null) {
                return expectedType; // the type does not have a discriminator. use it.
            } else {
                if (data[discriminatorProperty]) {
                    var discriminatorType = data[discriminatorProperty];
                    if(typeMap[discriminatorType]){
                        return discriminatorType; // use the type given in the discriminator
                    } else {
                        return expectedType; // discriminator did not map to a type
                    }
                } else {
                    return expectedType; // discriminator was not present (or an empty string)
                }
            }
        }
    }

    public static serialize(data: any, type: string) {
        if (data == undefined) {
            return data;
        } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        } else if (type.lastIndexOf("Array<", 0) === 0) { // string.startsWith pre es6
            let subType: string = type.replace("Array<", ""); // Array<Type> => Type>
            subType = subType.substring(0, subType.length - 1); // Type> => Type
            let transformedData: any[] = [];
            for (let index in data) {
                let date = data[index];
                transformedData.push(ObjectSerializer.serialize(date, subType));
            }
            return transformedData;
        } else if (type === "Date") {
            return data.toISOString();
        } else {
            if (enumsMap[type]) {
                return data;
            }
            if (!typeMap[type]) { // in case we dont know the type
                return data;
            }

            // Get the actual type of this object
            type = this.findCorrectType(data, type);

            // get the map for the correct type.
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            let instance: {[index: string]: any} = {};
            for (let index in attributeTypes) {
                let attributeType = attributeTypes[index];
                instance[attributeType.baseName] = ObjectSerializer.serialize(data[attributeType.name], attributeType.type);
            }
            return instance;
        }
    }

    public static deserialize(data: any, type: string) {
        // polymorphism may change the actual type.
        type = ObjectSerializer.findCorrectType(data, type);
        if (data == undefined) {
            return data;
        } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        } else if (type.lastIndexOf("Array<", 0) === 0) { // string.startsWith pre es6
            let subType: string = type.replace("Array<", ""); // Array<Type> => Type>
            subType = subType.substring(0, subType.length - 1); // Type> => Type
            let transformedData: any[] = [];
            for (let index in data) {
                let date = data[index];
                transformedData.push(ObjectSerializer.deserialize(date, subType));
            }
            return transformedData;
        } else if (type === "Date") {
            return new Date(data);
        } else {
            if (enumsMap[type]) {// is Enum
                return data;
            }

            if (!typeMap[type]) { // dont know the type
                return data;
            }
            let instance = new typeMap[type]();
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            for (let index in attributeTypes) {
                let attributeType = attributeTypes[index];
                instance[attributeType.name] = ObjectSerializer.deserialize(data[attributeType.baseName], attributeType.type);
            }
            return instance;
        }
    }
}

export interface Authentication {
    /**
    * Apply authentication settings to header and query params.
    */
    applyToRequest(requestOptions: localVarRequest.Options): Promise<void> | void;
}

export class HttpBasicAuth implements Authentication {
    public username: string = '';
    public password: string = '';

    applyToRequest(requestOptions: localVarRequest.Options): void {
        requestOptions.auth = {
            username: this.username, password: this.password
        }
    }
}

export class ApiKeyAuth implements Authentication {
    public apiKey: string = '';

    constructor(private location: string, private paramName: string) {
    }

    applyToRequest(requestOptions: localVarRequest.Options): void {
        if (this.location == "query") {
            (<any>requestOptions.qs)[this.paramName] = this.apiKey;
        } else if (this.location == "header" && requestOptions && requestOptions.headers) {
            requestOptions.headers[this.paramName] = this.apiKey;
        } else if (this.location == 'cookie' && requestOptions && requestOptions.headers) {
            if (requestOptions.headers['Cookie']) {
                requestOptions.headers['Cookie'] += '; ' + this.paramName + '=' + encodeURIComponent(this.apiKey);
            }
            else {
                requestOptions.headers['Cookie'] = this.paramName + '=' + encodeURIComponent(this.apiKey);
            }
        }
    }
}

export class OAuth implements Authentication {
    public accessToken: string = '';

    applyToRequest(requestOptions: localVarRequest.Options): void {
        if (requestOptions && requestOptions.headers) {
            requestOptions.headers["Authorization"] = "Bearer " + this.accessToken;
        }
    }
}

export class VoidAuth implements Authentication {
    public username: string = '';
    public password: string = '';

    applyToRequest(_: localVarRequest.Options): void {
        // Do nothing
    }
}
