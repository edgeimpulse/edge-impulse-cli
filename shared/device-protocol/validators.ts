// Generated from device-services-contracts/schema/ by device-services-contracts/generate.sh. Do not edit.
import * as implementation from './validators-implementation';

export interface ValidationError {
    instancePath: string;
    schemaPath: string;
    keyword: string;
    params: Record<string, unknown>;
    message?: string;
}
export interface Validator<T> {
    (value: unknown): value is T;
    errors?: ValidationError[] | null;
}
export const validateRemoteManagementMessage: Validator<import('./remote-management').RemoteManagementMessage> = implementation.validateRemoteManagementMessage as unknown as Validator<import('./remote-management').RemoteManagementMessage>;
export const validateTelemetry: Validator<import('./remote-management').Telemetry> = implementation.validateTelemetry as unknown as Validator<import('./remote-management').Telemetry>;
export const validateNewModelUpdated: Validator<import('./remote-management').NewModelUpdated> = implementation.validateNewModelUpdated as unknown as Validator<import('./remote-management').NewModelUpdated>;
export const validateInferenceSummary: Validator<import('./remote-management').InferenceSummary> = implementation.validateInferenceSummary as unknown as Validator<import('./remote-management').InferenceSummary>;
export const validateDeployModel: Validator<import('./remote-management').DeployModel> = implementation.validateDeployModel as unknown as Validator<import('./remote-management').DeployModel>;
export const validateRollbackModel: Validator<import('./remote-management').RollbackModel> = implementation.validateRollbackModel as unknown as Validator<import('./remote-management').RollbackModel>;
export const validateLegacyRemoteManagementMessage: Validator<import('./remote-management-legacy').LegacyRemoteManagementMessage> = implementation.validateLegacyRemoteManagementMessage as unknown as Validator<import('./remote-management-legacy').LegacyRemoteManagementMessage>;
export const validateWorkloadContractMessage: Validator<import('./workload-contract').WorkloadContractMessage> = implementation.validateWorkloadContractMessage as unknown as Validator<import('./workload-contract').WorkloadContractMessage>;
export const validateRegisterRequest: Validator<import('./workload-contract').RegisterRequest> = implementation.validateRegisterRequest as unknown as Validator<import('./workload-contract').RegisterRequest>;
export const validateRegisterResponse: Validator<import('./workload-contract').RegisterResponse> = implementation.validateRegisterResponse as unknown as Validator<import('./workload-contract').RegisterResponse>;
export const validateEventBatch: Validator<import('./workload-contract').EventBatch> = implementation.validateEventBatch as unknown as Validator<import('./workload-contract').EventBatch>;
export const validateEventBatchResponse: Validator<import('./workload-contract').EventBatchResponse> = implementation.validateEventBatchResponse as unknown as Validator<import('./workload-contract').EventBatchResponse>;
export const validateCommand: Validator<import('./workload-contract').Command> = implementation.validateCommand as unknown as Validator<import('./workload-contract').Command>;
export const validateCommandResult: Validator<import('./workload-contract').CommandResult> = implementation.validateCommandResult as unknown as Validator<import('./workload-contract').CommandResult>;
export const validateInferenceBundleManifest: Validator<import('./inference-bundle-manifest').InferenceBundleManifest> = implementation.validateInferenceBundleManifest as unknown as Validator<import('./inference-bundle-manifest').InferenceBundleManifest>;
