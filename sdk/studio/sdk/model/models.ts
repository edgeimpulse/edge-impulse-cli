import type { fetch as UndiciFetch, FormData as UndiciFormData, Response as UndiciResponse } from 'undici-types';

export * from './aIAction';
export * from './aIActionLastPreviewStateProposedChanges';
export * from './aIActionsConfig';
export * from './aIActionsConfigStep';
export * from './aIActionsDataCategory';
export * from './aIActionsOperatesOn';
export * from './acceptEulaRequest';
export * from './activateUserByThirdPartyActivationCodeRequest';
export * from './activateUserOrVerifyEmailRequest';
export * from './actorOAuthClient';
export * from './actorProjectApiKey';
export * from './actorUser';
export * from './addApiKeyRequest';
export * from './addApiKeyResponse';
export * from './addCollaboratorRequest';
export * from './addHmacKeyRequest';
export * from './addIngestionOnlyProjectApiKeyRequest';
export * from './addKerasFilesRequest';
export * from './addMemberRequest';
export * from './addOrganizationApiKeyRequest';
export * from './addOrganizationBucketRequest';
export * from './addOrganizationDataCampaignDashboardRequest';
export * from './addOrganizationDataCampaignDashboardResponse';
export * from './addOrganizationDataCampaignRequest';
export * from './addOrganizationDataCampaignResponse';
export * from './addOrganizationDeployBlockRequest';
export * from './addOrganizationDspBlockRequest';
export * from './addOrganizationSecretRequest';
export * from './addOrganizationTransferLearningBlockRequest';
export * from './addOrganizationTransformationBlockRequest';
export * from './addProjectApiKeyRequest';
export * from './additionalMetric';
export * from './adminAddDisallowedEmailDomainRequest';
export * from './adminAddOrUpdateSSODomainIdPsRequest';
export * from './adminAddOrganizationApiKeyRequest';
export * from './adminAddOrganizationUserRequest';
export * from './adminAddProjectApiKeyRequest';
export * from './adminAddProjectUserRequest';
export * from './adminAddUserRequest';
export * from './adminApiOrganization';
export * from './adminApiProject';
export * from './adminApiUser';
export * from './adminCreateOauthClientRequest';
export * from './adminCreateOauthClientResponse';
export * from './adminCreateOrganizationDataExportRequest';
export * from './adminCreateOrganizationRequest';
export * from './adminCreateProjectRequest';
export * from './adminCreateSignupApprovalRequest';
export * from './adminEnableFeatureRequest';
export * from './adminGetDataMigrationResponse';
export * from './adminGetDataMigrationsResponse';
export * from './adminGetDisallowedEmailDomainsResponse';
export * from './adminGetMetricsResponse';
export * from './adminGetOauthClientResponse';
export * from './adminGetOauthClientsResponse';
export * from './adminGetOrganizationComputeTimeUsageResponse';
export * from './adminGetOrganizationsResponse';
export * from './adminGetReportResponse';
export * from './adminGetReportsResponse';
export * from './adminGetSSOSettingsResponse';
export * from './adminGetSignupApprovalRequestResponse';
export * from './adminGetTrashBinResponse';
export * from './adminGetTrialResponse';
export * from './adminGetUserIdsResponse';
export * from './adminGetUserMetricsResponse';
export * from './adminGetUserResponse';
export * from './adminGetUsersResponse';
export * from './adminListProjects';
export * from './adminListProjectsResponse';
export * from './adminOrganizationInfoResponse';
export * from './adminProjectInfoResponse';
export * from './adminProjectKillSwitchResponse';
export * from './adminRotateOauthClientSecretResponse';
export * from './adminStartEnterpriseTrialRequest';
export * from './adminToggleDataMigrationRequest';
export * from './adminUpdateConfigRequest';
export * from './adminUpdateOauthClientRequest';
export * from './adminUpdateOrganizationDataExportRequest';
export * from './adminUpdateOrganizationRequest';
export * from './adminUpdateTrialRequest';
export * from './adminUpdateUserPermissionsRequest';
export * from './adminUpdateUserRequest';
export * from './akidaEdgeLearningConfig';
export * from './allBlocksResponse';
export * from './allLearnBlocksResponse';
export * from './anomalyCapacity';
export * from './anomalyConfig';
export * from './anomalyConfigAxes';
export * from './anomalyConfigResponse';
export * from './anomalyGmmMetadata';
export * from './anomalyGmmMetadataResponse';
export * from './anomalyLabelsConfig';
export * from './anomalyModelMetadata';
export * from './anomalyModelMetadataClusters';
export * from './anomalyModelMetadataResponse';
export * from './anomalyResult';
export * from './anomalyTrainedFeaturesResponse';
export * from './applicationBudget';
export * from './augmentationPolicyImageEnum';
export * from './augmentationPolicySpectrogram';
export * from './authorizeThirdPartyRequest';
export * from './autotuneDspRequest';
export * from './backToLabelingRequest';
export * from './batchAddMetadataRequest';
export * from './batchClearMetadataByKeyRequest';
export * from './batchEditBoundingBoxesRequest';
export * from './billingCycle';
export * from './blockDisplayCategory';
export * from './blockParameters';
export * from './blockParamsVisualAnomalyGmm';
export * from './blockParamsVisualAnomalyPatchcore';
export * from './blockThreshold';
export * from './blockType';
export * from './boundingBox';
export * from './boundingBoxWithScore';
export * from './buildOnDeviceModelRequest';
export * from './buildOnDeviceModelResponse';
export * from './buildOrganizationOnDeviceModelRequest';
export * from './calculateDataQualityMetricsRequest';
export * from './canaryResponse';
export * from './changePasswordRequest';
export * from './classifyJobResponse';
export * from './classifyJobResponsePage';
export * from './classifySampleResponse';
export * from './classifySampleResponseClassification';
export * from './classifySampleResponseClassificationDetails';
export * from './classifySampleResponseMultipleVariants';
export * from './classifySampleResponseVariantResults';
export * from './cloneImpulseRequest';
export * from './convertParquetToCsvRequest';
export * from './convertParquetToCsvResponse';
export * from './convertUserRequest';
export * from './cosineSimilarityData';
export * from './cosineSimilarityIssue';
export * from './countSamplesResponse';
export * from './createDeveloperProfileResponse';
export * from './createDeviceRequest';
export * from './createEnterpriseTrialResponse';
export * from './createEnterpriseTrialUserRequest';
export * from './createImpulseRequest';
export * from './createImpulseResponse';
export * from './createMultiProjectDeploymentRequest';
export * from './createNewEmptyImpulseRequest';
export * from './createNewEmptyImpulseResponse';
export * from './createOrganizationPortalRequest';
export * from './createOrganizationPortalResponse';
export * from './createOrganizationRequest';
export * from './createOrganizationResponse';
export * from './createOrganizationUsageReportBody';
export * from './createPreviewAIActionsJobRequest';
export * from './createProTierUserRequest';
export * from './createProjectRequest';
export * from './createProjectResponse';
export * from './createSignedUploadLinkRequest';
export * from './createSignedUploadLinkResponse';
export * from './createSyntheticDataRequest';
export * from './createTestUserRequest';
export * from './createTestUserResponse';
export * from './createThirdPartyAuthRequest';
export * from './createThirdPartyAuthResponse';
export * from './createUserRequest';
export * from './createUserResponse';
export * from './createUserThirdPartyRequest';
export * from './createUserThirdPartyResponse';
export * from './createWhitelabelRequest';
export * from './createWhitelabelResponse';
export * from './createdUpdatedByUser';
export * from './cropSampleRequest';
export * from './cropSampleResponse';
export * from './crossValidationData';
export * from './dBAction';
export * from './dSPBlock';
export * from './dSPConfig';
export * from './dSPConfigRequest';
export * from './dSPConfigResponse';
export * from './dSPGroup';
export * from './dSPGroupItem';
export * from './dSPInfo';
export * from './dSPMetadata';
export * from './dSPMetadataIncludedSamples';
export * from './dSPMetadataOutputConfig';
export * from './dSPMetadataResponse';
export * from './dSPNamedAxis';
export * from './dSPNormalizeData';
export * from './dailyMetricsRecord';
export * from './dataCampaign';
export * from './dataCampaignDashboard';
export * from './dataCampaignGraph';
export * from './dataCampaignLink';
export * from './dataCampaignQuery';
export * from './dataExplorerPredictionsResponse';
export * from './dataExplorerSettings';
export * from './datasetRatioData';
export * from './datasetRatioDataRatio';
export * from './datasetSplitOptions';
export * from './datasetSplitPreview';
export * from './datasetSplitPreviewResponse';
export * from './datasetSplitPreviewRow';
export * from './datasetSplitPreviewSection';
export * from './datasetVersion';
export * from './datasetVersionChangeItem';
export * from './datasetVersionPendingWindow';
export * from './datasetVersionSummary';
export * from './datasetVersionType';
export * from './deletePortalFileRequest';
export * from './deleteTestUserRequest';
export * from './deleteTestUserResponse';
export * from './deleteUserRequest';
export * from './dependencyData';
export * from './deployPretrainedModelInputAudio';
export * from './deployPretrainedModelInputImage';
export * from './deployPretrainedModelInputOther';
export * from './deployPretrainedModelInputTimeSeries';
export * from './deployPretrainedModelModelAnomaly';
export * from './deployPretrainedModelModelClassification';
export * from './deployPretrainedModelModelFreeform';
export * from './deployPretrainedModelModelObjectDetection';
export * from './deployPretrainedModelModelRegression';
export * from './deployPretrainedModelModelVisualAnomaly';
export * from './deployPretrainedModelRequest';
export * from './deployPretrainedModelRequestModelInfo';
export * from './deploymentHistory';
export * from './deploymentTarget';
export * from './deploymentTargetBadge';
export * from './deploymentTargetEngine';
export * from './deploymentTargetRedirect';
export * from './deploymentTargetVariant';
export * from './deploymentTargetsResponse';
export * from './detailedImpulse';
export * from './detailedImpulseMetric';
export * from './detailedImpulseMetricCategory';
export * from './detailedImpulseMetricFilteringType';
export * from './developmentBoardRequest';
export * from './developmentBoardRequestUpdate';
export * from './developmentBoardResponse';
export * from './developmentBoardsResponse';
export * from './developmentKeys';
export * from './developmentKeysResponse';
export * from './device';
export * from './deviceDebugStreamType';
export * from './deviceNameResponse';
export * from './downgradeSubscriptionRequest';
export * from './download';
export * from './downloadPortalFileRequest';
export * from './downloadPortalFileResponse';
export * from './dspAutotunerResults';
export * from './dspAutotunerResultsAllOfResults';
export * from './dspFeatureImportanceResponse';
export * from './dspFeatureLabelsResponse';
export * from './dspPerformance';
export * from './dspPerformanceAllVariantsResponse';
export * from './dspRunGraph';
export * from './dspRunRequestWithFeatures';
export * from './dspRunRequestWithoutFeatures';
export * from './dspRunRequestWithoutFeaturesReadOnly';
export * from './dspRunResponse';
export * from './dspRunResponseWithSample';
export * from './dspSampleFeaturesResponse';
export * from './dspTrainedFeaturesResponse';
export * from './editSampleLabelRequest';
export * from './emailValidationRequest';
export * from './enterpriseLimit';
export * from './enterpriseLimitsIncreaseRequest';
export * from './enterpriseTrial';
export * from './enterpriseUpgradeOrTrialExtensionRequest';
export * from './entitlementLimits';
export * from './entityCreatedResponse';
export * from './environmentVariable';
export * from './evaluateJobResponse';
export * from './evaluateResultValue';
export * from './experimentalImpulseSpecificGpuTrainingProcessor';
export * from './exportBlockResponse';
export * from './exportGetUrlResponse';
export * from './exportInferenceHistoryDataRequest';
export * from './exportKerasBlockDataRequest';
export * from './exportOriginalDataRequest';
export * from './exportWavDataRequest';
export * from './feature';
export * from './findSegmentSampleRequest';
export * from './findSegmentSampleResponse';
export * from './findSyntiantPosteriorRequest';
export * from './findUserResponse';
export * from './generateFeaturesRequest';
export * from './genericApiResponse';
export * from './getAIActionResponse';
export * from './getAIActionsProposedChangesResponse';
export * from './getAllDetailedImpulsesResponse';
export * from './getAllImportedFromResponse';
export * from './getAllImpulsesResponse';
export * from './getAllThirdPartyAuthResponse';
export * from './getAllTransferLearningModelsResponse';
export * from './getAllWhitelabelsResponse';
export * from './getAutoLabelerResponse';
export * from './getCsvWizardUploadedFileInfo';
export * from './getDataExplorerFeaturesResponse';
export * from './getDataExplorerSettingsResponse';
export * from './getDatasetRatioResponse';
export * from './getDatasetVersionRawDataResponse';
export * from './getDatasetVersionRawDataSampleResponse';
export * from './getDatasetVersionResponse';
export * from './getDatasetVersionSampleChangeDetailsResponse';
export * from './getDeploymentHistoryResponse';
export * from './getDeploymentResponse';
export * from './getDeviceResponse';
export * from './getDiversityDataResponse';
export * from './getEmailVerificationCodeResponse';
export * from './getEmailVerificationStatusResponse';
export * from './getFeatureFlagsResponse';
export * from './getFeaturesForPostProcessingSampleResponse';
export * from './getHmacDevkeyResponse';
export * from './getImpulseBlocksResponse';
export * from './getImpulseRecordsRequest';
export * from './getImpulseResponse';
export * from './getInferenceHistoryResponse';
export * from './getInferenceMetricsRequest';
export * from './getInferenceMetricsResponse';
export * from './getIntegrationSessionStatusResponse';
export * from './getJWTRequest';
export * from './getJWTResponse';
export * from './getJobResponse';
export * from './getLabelNoiseDataResponse';
export * from './getLastDeploymentBuildResponse';
export * from './getModelMonitoringDeploymentsResponse';
export * from './getModelVariantsResponse';
export * from './getNewBlockIdResponse';
export * from './getOrganizationBucketResponse';
export * from './getOrganizationDataCampaignDashboardResponse';
export * from './getOrganizationDataCampaignDashboardsResponse';
export * from './getOrganizationDataCampaignResponse';
export * from './getOrganizationDataCampaignsResponse';
export * from './getOrganizationDataExportResponse';
export * from './getOrganizationDataExportsResponse';
export * from './getOrganizationDataItemResponse';
export * from './getOrganizationDataItemTransformJobsResponse';
export * from './getOrganizationDatasetResponse';
export * from './getOrganizationDeployBlockResponse';
export * from './getOrganizationDspBlockResponse';
export * from './getOrganizationPipelinesResponse';
export * from './getOrganizationPortalResponse';
export * from './getOrganizationTransferLearningBlockResponse';
export * from './getOrganizationTransformationBlockResponse';
export * from './getOrganizationUsageReportResponse';
export * from './getPerformanceCalibrationGroundTruthResponse';
export * from './getPerformanceCalibrationParameterSetsResponse';
export * from './getPerformanceCalibrationParametersResponse';
export * from './getPerformanceCalibrationRawResultResponse';
export * from './getPerformanceCalibrationStatusResponse';
export * from './getPostProcessingFeaturesForSampleResponse';
export * from './getPostProcessingResultsForSampleResponse';
export * from './getPostProcessingResultsForSampleResponseAllOfResults';
export * from './getPostProcessingResultsResponse';
export * from './getPretrainedModelResponse';
export * from './getPublicMetricsResponse';
export * from './getPublicOrganizationTransformationBlockResponse';
export * from './getRawDataMetadataCooccurrenceResponse';
export * from './getRawDataMetadataDistributionResponse';
export * from './getRawDataProjectMetadataResponse';
export * from './getSSODomainIdPsResponse';
export * from './getSampleDspResponse';
export * from './getSampleMetadataFilterOptionsResponse';
export * from './getSampleMetadataResponse';
export * from './getSampleResponse';
export * from './getStudioConfigResponse';
export * from './getSyntheticDataConfigResponse';
export * from './getSyntiantPosteriorResponse';
export * from './getTargetConstraintsResponse';
export * from './getThemeResponse';
export * from './getThemesResponse';
export * from './getThirdPartyAuthResponse';
export * from './getUserNeedToSetPasswordResponse';
export * from './getUserProjectsResponse';
export * from './getUserResponse';
export * from './getWhitelabelDomainResponse';
export * from './getWhitelabelResponse';
export * from './hasDataExplorerFeaturesResponse';
export * from './imageInputResizeMode';
export * from './imageInputScaling';
export * from './importDataFromAnotherProjectJobRequest';
export * from './impulse';
export * from './impulseDspBlock';
export * from './impulseInputBlock';
export * from './impulseInputBlockDatasetSubset';
export * from './impulseLearnBlock';
export * from './impulsePostProcessingBlock';
export * from './impulseType';
export * from './inferenceHistoryAggregate';
export * from './inferenceHistoryEntry';
export * from './inferenceHistoryTimestamp';
export * from './inferenceSummaryMetrics';
export * from './inputBlock';
export * from './inputBlockType';
export * from './integrationSessionStatus';
export * from './inviteOrganizationMemberRequest';
export * from './job';
export * from './jobDetails';
export * from './jobDetailsResponse';
export * from './jobFailureDetails';
export * from './jobLogsResponse';
export * from './jobMetricsResponse';
export * from './jobParentTypeEnum';
export * from './jobState';
export * from './jobStateExecutionDetails';
export * from './jobStatus';
export * from './jobStep';
export * from './jobSummaryResponse';
export * from './keepDeviceDebugStreamAliveRequest';
export * from './kerasConfig';
export * from './kerasCustomMetric';
export * from './kerasModelLayer';
export * from './kerasModelMetadata';
export * from './kerasModelMetadataGraph';
export * from './kerasModelMetadataGraphSeries';
export * from './kerasModelMetadataMetrics';
export * from './kerasModelMetadataResponse';
export * from './kerasModelMode';
export * from './kerasModelTypeEnum';
export * from './kerasModelVariantEnum';
export * from './kerasResponse';
export * from './kerasVisualLayer';
export * from './kerasVisualLayerType';
export * from './lastModificationDateResponse';
export * from './lastUpdatedByDatasetVersionRestore';
export * from './lastUpdatedByOAuthClient';
export * from './lastUpdatedByProjectApiKey';
export * from './lastUpdatedByUser';
export * from './latencyDevice';
export * from './learnBlock';
export * from './learnBlockType';
export * from './listAIActionsResponse';
export * from './listApiKeysResponse';
export * from './listDatasetVersionChangesResponse';
export * from './listDatasetVersionsResponse';
export * from './listDeploymentHistoryResponse';
export * from './listDevicesResponse';
export * from './listEmailResponse';
export * from './listEnterpriseTrialsResponse';
export * from './listHmacKeysResponse';
export * from './listJobsResponse';
export * from './listModelsResponse';
export * from './listOrganizationApiKeysResponse';
export * from './listOrganizationBucketsResponse';
export * from './listOrganizationBucketsUserResponse';
export * from './listOrganizationDataResponse';
export * from './listOrganizationDeployBlocksResponse';
export * from './listOrganizationDspBlocksResponse';
export * from './listOrganizationFilesResponse';
export * from './listOrganizationPipelinesResponse';
export * from './listOrganizationPortalsResponse';
export * from './listOrganizationSecretsResponse';
export * from './listOrganizationTransferLearningBlocksResponse';
export * from './listOrganizationTransformationBlocksResponse';
export * from './listOrganizationUsageReportsResponse';
export * from './listOrganizationsResponse';
export * from './listPortalFilesInFolderRequest';
export * from './listPortalFilesInFolderResponse';
export * from './listProjects';
export * from './listProjectsResponse';
export * from './listPublicOrganizationTransformationBlocksResponse';
export * from './listPublicProjectTypes';
export * from './listPublicProjectTypesProjectTypes';
export * from './listPublicProjectTypesResponse';
export * from './listPublicProjects';
export * from './listPublicProjectsResponse';
export * from './listPublicVersionsResponse';
export * from './listSamplesResponse';
export * from './listTunerRunsResponse';
export * from './listVersionsResponse';
export * from './logAnalyticsEventRequest';
export * from './logStdoutResponse';
export * from './logStdoutResponseAllOfStdout';
export * from './logWebsitePageviewRequest';
export * from './loginResponse';
export * from './memorySpec';
export * from './metadataDistributionBucket';
export * from './metadataDistributionLabelBreakdown';
export * from './metadataFilterOptions';
export * from './metadataFilterOptionsOptionsList';
export * from './metricsAllVariantsResponse';
export * from './metricsForModelVariant';
export * from './migration';
export * from './modelEngineShortEnum';
export * from './modelPrediction';
export * from './modelResult';
export * from './modelVariantStats';
export * from './moveRawDataRequest';
export * from './neighborsData';
export * from './neighborsScore';
export * from './oAuthScope';
export * from './oauthClient';
export * from './oauthClientProperties';
export * from './oauthGrantType';
export * from './objectDetectionAutoLabelRequest';
export * from './objectDetectionAutoLabelResponse';
export * from './objectDetectionLabelQueueCountResponse';
export * from './objectDetectionLabelQueueResponse';
export * from './objectDetectionLastLayer';
export * from './objectDetectionPostProcessingObject';
export * from './objectDetectionPostProcessingResult';
export * from './objectTrackingPostProcessingObject';
export * from './objectTrackingPostProcessingResult';
export * from './optimizeConfig';
export * from './optimizeConfigOptimizationObjectives';
export * from './optimizeConfigResponse';
export * from './optimizeConfigSearchSpaceSource';
export * from './optimizeConfigSearchSpaceTemplate';
export * from './optimizeConfigTargetDevice';
export * from './optimizeDSPParametersResponse';
export * from './optimizeSpaceResponse';
export * from './optimizeStateResponse';
export * from './optimizeTransferLearningModelsResponse';
export * from './organization';
export * from './organizationAddDataFileRequest';
export * from './organizationAddDataFolderRequest';
export * from './organizationAddDataFolderResponse';
export * from './organizationAddDataItemRequest';
export * from './organizationAddDatasetRequest';
export * from './organizationApiKey';
export * from './organizationBucket';
export * from './organizationBulkMetadataRequest';
export * from './organizationComputeTimeUsage';
export * from './organizationCreateProject';
export * from './organizationCreateProjectOutputDatasetPathRule';
export * from './organizationCreateProjectPathFilter';
export * from './organizationCreateProjectRequest';
export * from './organizationCreateProjectResponse';
export * from './organizationCreateProjectStatusResponse';
export * from './organizationCreateProjectTransformationSummary';
export * from './organizationCreateProjectWithFiles';
export * from './organizationDataCampaignDiffRequest';
export * from './organizationDataCampaignDiffResponse';
export * from './organizationDataExport';
export * from './organizationDataItem';
export * from './organizationDataset';
export * from './organizationDatasetBucket';
export * from './organizationDatasetTypeEnum';
export * from './organizationDeployBlock';
export * from './organizationDspBlock';
export * from './organizationGetCreateProjectsResponse';
export * from './organizationInfoResponse';
export * from './organizationMemberRole';
export * from './organizationMetricsResponse';
export * from './organizationPipeline';
export * from './organizationPipelineItemCount';
export * from './organizationPipelineRun';
export * from './organizationPipelineRunStep';
export * from './organizationPipelineStep';
export * from './organizationTransferLearningBlock';
export * from './organizationTransferLearningBlockCustomVariant';
export * from './organizationTransferLearningBlockModelFile';
export * from './organizationTransferLearningOperatesOn';
export * from './organizationTransformationBlock';
export * from './organizationUpdatePipelineBody';
export * from './organizationUser';
export * from './performanceCalibrationDetection';
export * from './performanceCalibrationFalsePositive';
export * from './performanceCalibrationGroundTruth';
export * from './performanceCalibrationParameterSet';
export * from './performanceCalibrationParameters';
export * from './performanceCalibrationParametersStandard';
export * from './performanceCalibrationRawDetection';
export * from './performanceCalibrationSaveParameterSetRequest';
export * from './performanceCalibrationUploadLabeledAudioRequest';
export * from './performanceCalibrationUploadLabeledAudioResponse';
export * from './permission';
export * from './portalFile';
export * from './portalInfoResponse';
export * from './postProcessingBlock';
export * from './postProcessingConfig';
export * from './postProcessingConfigRequest';
export * from './postProcessingConfigResponse';
export * from './postProcessingFeaturesForSampleRequest';
export * from './pretrainedModelTensor';
export * from './previewAIActionsSamplesRequest';
export * from './previewDefaultFilesInFolderRequest';
export * from './previewDefaultFilesInFolderResponse';
export * from './previewProcessingConfigRequest';
export * from './profileModelInfo';
export * from './profileModelInfoMemory';
export * from './profileModelInfoMemoryDetails';
export * from './profileModelTable';
export * from './profileModelTableMcu';
export * from './profileModelTableMpu';
export * from './profileTfLiteRequest';
export * from './profileTfLiteResponse';
export * from './project';
export * from './projectApiKey';
export * from './projectApiKeyLastUsed';
export * from './projectCollaborator';
export * from './projectDataAxesSummaryResponse';
export * from './projectDataIntervalResponse';
export * from './projectDataSummary';
export * from './projectDatasetMetadataBase';
export * from './projectDatasetMetadataCategoryData';
export * from './projectDatasetMetadataClasses';
export * from './projectDatasetMetadataClassesCategory';
export * from './projectDatasetMetadataCommon';
export * from './projectDatasetMetadataRatioClass';
export * from './projectDatasetMetadataRatioClasses';
export * from './projectDatasetMetadataRatioCount';
export * from './projectDatasetMetadataRatioNoRatio';
export * from './projectDatasetMetadataRatioRegression';
export * from './projectDatasetMetadataRegression';
export * from './projectDatasetMetadataRegressionCategory';
export * from './projectDeploymentTarget';
export * from './projectDeploymentTargetsResponse';
export * from './projectDismissNotificationRequest';
export * from './projectDownloadsResponse';
export * from './projectHmacKey';
export * from './projectInfoResponse';
export * from './projectInfoResponseAllOfExperiments';
export * from './projectInfoSummaryResponse';
export * from './projectLabelingMethod';
export * from './projectModelVariant';
export * from './projectPrivateData';
export * from './projectPublicData';
export * from './projectPublicDataReadme';
export * from './projectSampleMetadata';
export * from './projectTierEnum';
export * from './projectTrainingDataSummaryResponse';
export * from './projectType';
export * from './projectVersionRequest';
export * from './projectVisibility';
export * from './publicOrganizationTransformationBlock';
export * from './publicProjectLicense';
export * from './publicProjectTierAvailability';
export * from './rawDataCategory';
export * from './rawDataFilterCategory';
export * from './rawDataLabelDistributionLabel';
export * from './rawDataLabelDistributionRegressionValueGroup';
export * from './rawDataLabelDistributionRegressionValueGroupsPerKey';
export * from './rawSampleData';
export * from './rawSampleDataStreamPayloads';
export * from './rawSampleDataStreamPayloadsDatastreamPayloads';
export * from './rawSampleDataWithDataStreamPayloads';
export * from './rawSamplePayload';
export * from './rebalanceDatasetResponse';
export * from './removeCollaboratorRequest';
export * from './removeMemberRequest';
export * from './renameDeviceRequest';
export * from './renamePortalFileRequest';
export * from './renameSampleRequest';
export * from './report';
export * from './requestEmailVerificationRequest';
export * from './requestResetPasswordRequest';
export * from './resetPasswordRequest';
export * from './resourceRange';
export * from './restoreProjectFromPublicRequest';
export * from './restoreProjectRequest';
export * from './runOrganizationPipelineResponse';
export * from './sample';
export * from './sampleBoundingBoxesRequest';
export * from './sampleDatastream';
export * from './sampleDatastreamImageDimensions';
export * from './sampleKeyValueLabels';
export * from './sampleLabelMapLabels';
export * from './sampleLabelMapRequest';
export * from './sampleMetadata';
export * from './sampleProposedChanges';
export * from './savePretrainedModelRequest';
export * from './scoreTrialResponse';
export * from './segmentSampleRequest';
export * from './segmentSampleRequestSegments';
export * from './sendUserFeedbackRequest';
export * from './sensor';
export * from './setAIActionsOrderRequest';
export * from './setAnomalyParameterRequest';
export * from './setImpulseThresholdsRequest';
export * from './setImpulseThresholdsResponse';
export * from './setKerasParameterRequest';
export * from './setLegacyImpulseStateInternalRequest';
export * from './setMemberDatasetsRequest';
export * from './setMemberRoleRequest';
export * from './setOptimizeSpaceRequest';
export * from './setOrganizationDataDatasetRequest';
export * from './setProjectComputeTimeRequest';
export * from './setProjectDspFileSizeRequest';
export * from './setSampleMetadataRequest';
export * from './setSampleProposedChangesRequest';
export * from './setSampleStructuredLabelsRequest';
export * from './setSampleVideoDimensionsRequest';
export * from './setSyntiantPosteriorRequest';
export * from './setTunerPrimaryJobRequest';
export * from './setUserPasswordRequest';
export * from './socketTokenResponse';
export * from './splitSampleInFramesRequest';
export * from './staffInfo';
export * from './startClassifyJobRequest';
export * from './startDeviceDebugStreamResponse';
export * from './startDeviceSnapshotDebugStreamRequest';
export * from './startEnterpriseTrialRequest';
export * from './startIntegrationSessionResponse';
export * from './startJobResponse';
export * from './startPerformanceCalibrationRequest';
export * from './startPostProcessingRequest';
export * from './startSamplingRequest';
export * from './startSamplingResponse';
export * from './startTensorBoardSessionRequest';
export * from './startTrainingRequestAnomaly';
export * from './stopDeviceDebugStreamRequest';
export * from './storageProvider';
export * from './storeInferenceHistoryRequest';
export * from './storeSegmentLengthRequest';
export * from './structuredClassifyResult';
export * from './structuredLabel';
export * from './targetConstraints';
export * from './targetConstraintsDevice';
export * from './targetMemory';
export * from './targetProcessor';
export * from './testAddMockModelMonitoringDataRequest';
export * from './testPretrainedModelImagesRequest';
export * from './testPretrainedModelRequest';
export * from './testPretrainedModelResponse';
export * from './theme';
export * from './thirdPartyAuth';
export * from './thresholdValue';
export * from './timeSeriesDataPoint';
export * from './trackObjectsRequest';
export * from './trackObjectsResponse';
export * from './transferLearningModel';
export * from './transferOwnershipOrganizationRequest';
export * from './transformationBlockAdditionalMountPoint';
export * from './transformationJobOperatesOnEnum';
export * from './transformationJobStatusEnum';
export * from './trashBinEntity';
export * from './tunerBlock';
export * from './tunerCompleteSearch';
export * from './tunerCreateTrialImpulse';
export * from './tunerRun';
export * from './tunerSpaceImpulse';
export * from './tunerTrial';
export * from './tunerTrialImpulse';
export * from './tutorialType';
export * from './updateAIActionRequest';
export * from './updateDatasetVersionRequest';
export * from './updateImpulseRequest';
export * from './updateJobRequest';
export * from './updateOrganizationAddCollaboratorRequest';
export * from './updateOrganizationBucketRequest';
export * from './updateOrganizationCreateEmptyProjectRequest';
export * from './updateOrganizationCreateProjectRequest';
export * from './updateOrganizationDataCampaignDashboardRequest';
export * from './updateOrganizationDataCampaignRequest';
export * from './updateOrganizationDataItemRequest';
export * from './updateOrganizationDatasetRequest';
export * from './updateOrganizationDeployBlockRequest';
export * from './updateOrganizationDspBlockRequest';
export * from './updateOrganizationPortalResponse';
export * from './updateOrganizationRequest';
export * from './updateOrganizationTransferLearningBlockRequest';
export * from './updateOrganizationTransformationBlockRequest';
export * from './updateProjectRequest';
export * from './updateProjectTagsRequest';
export * from './updateThemeColorsRequest';
export * from './updateThemeLogosRequest';
export * from './updateThirdPartyAuthRequest';
export * from './updateTunerRunRequest';
export * from './updateUserRequest';
export * from './updateVersionRequest';
export * from './updateWhitelabelDefaultDeploymentTargetRequest';
export * from './updateWhitelabelDeploymentOptionsOrderRequest';
export * from './updateWhitelabelDeploymentTargetsRequest';
export * from './updateWhitelabelInternalRequest';
export * from './updateWhitelabelLearningBlocksRequest';
export * from './updateWhitelabelRequest';
export * from './upgradeSubscriptionRequest';
export * from './uploadAssetRequest';
export * from './uploadAssetResponse';
export * from './uploadCsvWizardUploadedFileRequest';
export * from './uploadCustomBlockRequest';
export * from './uploadImageRequest';
export * from './uploadKerasFilesRequest';
export * from './uploadPretrainedModelByUrlRequest';
export * from './uploadPretrainedModelRequest';
export * from './uploadReadmeImageResponse';
export * from './uploadUserPhotoRequest';
export * from './uploadUserPhotoResponse';
export * from './uploadVersionArchiveRequest';
export * from './user';
export * from './userByThirdPartyActivationRequest';
export * from './userDeleteTotpMfaKeyRequest';
export * from './userDismissNotificationRequest';
export * from './userEula';
export * from './userEulaName';
export * from './userExperiment';
export * from './userGenerateNewMfaKeyResponse';
export * from './userOrganization';
export * from './userProjectsSortOrder';
export * from './userSetTotpMfaKeyRequest';
export * from './userSetTotpMfaKeyResponse';
export * from './userSubscriptionMetricsResponse';
export * from './userTierEnum';
export * from './validateEmailResponse';
export * from './verifyDspBlockUrlRequest';
export * from './verifyDspBlockUrlResponse';
export * from './verifyEmailResponse';
export * from './verifyOrganizationBucketRequest';
export * from './verifyOrganizationBucketResponse';
export * from './verifyOrganizationExistingBucketRequest';
export * from './verifyResetPasswordRequest';
export * from './verifySignupApprovalResponse';
export * from './vlmCandidateLabelItem';
export * from './vlmCandidateLabelMap';
export * from './vlmConfigResponse';
export * from './vlmConfiguration';
export * from './vlmConfigurationBase';
export * from './vlmGetAllModelsResponse';
export * from './vlmGetInferenceResultsResponse';
export * from './vlmGetModelResponse';
export * from './vlmInferenceRequest';
export * from './vlmInferenceResults';
export * from './vlmInferenceResultsResults';
export * from './vlmMetadata';
export * from './vlmModel';
export * from './vlmModelType';
export * from './vlmPromptComponent';
export * from './vlmPromptComponentConfig';
export * from './vlmPromptConfigParamItem';
export * from './vlmPromptConfigParameters';
export * from './vlmSetConfigResponse';
export * from './whitelabel';
export * from './whitelabelAdminCreateOrganizationRequest';
export * from './windowSettings';
export * from './windowSettingsResponse';

export type RequestOptionsType = { method: string; headers: Record<string, string>; body?: any };
type ApplyToRequestResult = {
  requestOptions: RequestOptionsType;
  url: string;
};

export interface Authentication {
    /**
    * Apply authentication settings to header and query params.
    * Returns updated requestOptions and url (for query params).
    */
    applyToRequest(requestOptions: RequestOptionsType, url: string): ApplyToRequestResult | Promise<ApplyToRequestResult>;
}

export class HttpBasicAuth implements Authentication {
    public username: string = '';
    public password: string = '';

    applyToRequest(requestOptions: RequestOptionsType, url: string) {
        const headers = { ...(requestOptions.headers || {}) };
        headers['Authorization'] = 'Basic ' + (typeof btoa !== 'undefined'
            ? btoa(this.username + ':' + this.password)
            : Buffer.from(this.username + ':' + this.password).toString('base64'));
        return { requestOptions: { ...requestOptions, headers }, url };
    }
}

export class ApiKeyAuth implements Authentication {
    public apiKey = '';

    constructor(private location: 'query' | 'header' | 'cookie', private paramName: string) {
    }

    applyToRequest(requestOptions: RequestOptionsType, url: string) {
        const headers = { ...(requestOptions.headers || {}) };
        let newUrl = url;

        if (!this.apiKey) {
            return { requestOptions: { ...requestOptions, headers }, url: newUrl };
        }

        switch (this.location) {
            case 'query': {
                const urlObj = new URL(url);
                urlObj.searchParams.append(this.paramName, this.apiKey);
                newUrl = urlObj.toString();
                break;
            }
            case 'header':
                headers[this.paramName] = this.apiKey;
                break;
            case 'cookie': {
                const cookie = `${this.paramName}=${encodeURIComponent(this.apiKey)}`;
                headers['Cookie'] = headers['Cookie'] ? `${headers['Cookie']}; ${cookie}` : cookie;
                break;
            }
        }

        return { requestOptions: { ...requestOptions, headers }, url: newUrl };
    }
}

export class OAuth implements Authentication {
    public accessToken: string = '';

    applyToRequest(requestOptions: RequestOptionsType, url: string) {
        const headers = { ...(requestOptions.headers || {}) };
        headers['Authorization'] = 'Bearer ' + this.accessToken;
        return { requestOptions: { ...requestOptions, headers }, url };
    }
}


export class VoidAuth implements Authentication {
    public username: string = '';
    public password: string = '';

    applyToRequest(requestOptions: RequestOptionsType, url: string) {
        return { requestOptions, url };
    }
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// Loop over all potential ISO Date strings and convert them into Date objects
export const convertISODateStringsOnObj = (obj: any) => {
    if (typeof obj !== 'object' || !obj /* typeof null === 'object' */) {
        return obj;
    }

    for (const k of Object.keys(obj)) {
        const value = obj[k];
        if (typeof value === 'string') {
            // if it looks like an ISO date (e.g. 2023-01-01T10:00:00Z)
            // we try to parse it, and if the date is valid we swap the string out for the date
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
                let date = new Date(value);
                if (!isNaN(+date)) {
                    obj[k] = date;
                }
            }
        }
        else if (typeof value === 'object') {
            obj[k] = convertISODateStringsOnObj(obj[k]);
        }
        else {
            // noop
        }
    }

    return obj;
};
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable @typescript-eslint/no-unsafe-argument */
/* eslint-enable @typescript-eslint/no-unsafe-member-access */

export type LocalFormParams = Record<string, string> | FormData | UndiciFormData;

export async function parseResponse(res: Response | UndiciResponse): Promise<any> {
    const ct = (res.headers.get('content-type') || '').toLowerCase();

    if (ct.includes('application/json')) return res.json();

    if (/^(image|video|audio)\/|application\/(octet-stream|zip|x-tar|cbor)/.test(ct)) {
        return Buffer.from(await res.arrayBuffer());
    }

    return res.text();
}

export function serializeFormDataValue(value: any, type: string): any {
    if (value === undefined || value === null) return value;

    const normalizedType = type.toLowerCase();
    if (['string', 'boolean', 'number', 'integer', 'long', 'float', 'double'].includes(normalizedType)) {
        return value.toString();
    }

    if (type === 'Date' && value instanceof Date) {
        return value.toISOString();
    }

    if (type.lastIndexOf('Array<', 0) === 0) {
        const subType = type.slice('Array<'.length, -1);
        return value.map((item: any) => serializeFormDataValue(item, subType));
    }

    return value;
}

export function isFormData(formParams: LocalFormParams | undefined): formParams is FormData | UndiciFormData {
    return formParams instanceof FormData;
}

export function ensureFormData(formParams: LocalFormParams | undefined): FormData | UndiciFormData {
    if (isFormData(formParams)) return formParams;

    const multipartFormParams = new FormData();
    const recordFormParams = formParams as Record<string, string> | undefined;
    if (recordFormParams) {
        for (const key of Object.keys(recordFormParams)) {
            multipartFormParams.append(key, recordFormParams[key]);
        }
    }
    return multipartFormParams;
}

export function appendFormField(formParams: LocalFormParams | undefined, key: string, value: any): LocalFormParams {
    if (isFormData(formParams)) {
        formParams.append(key, value);
        return formParams;
    }

    const recordFormParams = (formParams as Record<string, string> | undefined) || {};
    recordFormParams[key] = value;
    return recordFormParams;
}

export function applyFormParams(requestOptions: RequestOptionsType, formParams: LocalFormParams | undefined) {
    if (!formParams) return;

    delete requestOptions.headers['Content-Type'];
    if (isFormData(formParams)) {
        requestOptions.body = formParams;
    }
    else {
        const recordFormParams = formParams as Record<string, string>;
        if (Object.keys(recordFormParams).length === 0) return;

        requestOptions.body = new URLSearchParams(recordFormParams).toString();
        requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
}

export const COLLECTION_FORMATS = {
    'csv': ',',
    'tsv': '   ',
    'ssv': ' ',
    'pipes': '|'
};
