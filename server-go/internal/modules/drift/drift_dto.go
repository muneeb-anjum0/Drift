package drift

type AnalyzeRequest struct {
	ProjectID         string `json:"projectId" validate:"required"`
	BaselineVersionID string `json:"baselineVersionId" validate:"required"`
	InputText         string `json:"inputText" validate:"required"`
	InputType         string `json:"inputType"`
}

type SaveRequest struct {
	ProjectID           string                      `json:"projectId" validate:"required"`
	BaselineVersionID   string                      `json:"baselineVersionId" validate:"required"`
	InputText           string                      `json:"inputText" validate:"required"`
	InputType           string                      `json:"inputType"`
	DetectedChanges     []DetectedChange            `json:"detectedChanges"`
	RequirementResults  []RequirementAnalysisResult `json:"requirementResults"`
	DriftScore          int                         `json:"driftScore"`
	RiskLevel           string                      `json:"riskLevel"`
	Summary             string                      `json:"summary"`
	AddedCount          int                         `json:"addedCount"`
	ModifiedCount       int                         `json:"modifiedCount"`
	RemovedCount        int                         `json:"removedCount"`
	AmbiguousCount      int                         `json:"ambiguousCount"`
	ContradictionCount  int                         `json:"contradictionCount"`
	EstimatedExtraHours float64                     `json:"estimatedExtraHours"`
	AnalysisEngine      string                      `json:"analysisEngine"`
	Status              string                      `json:"status"`
}
