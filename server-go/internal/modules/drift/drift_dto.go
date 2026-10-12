package drift

type AnalyzeRequest struct {
	ProjectID         string `json:"projectId" validate:"required"`
	BaselineVersionID string `json:"baselineVersionId" validate:"required"`
	InputText         string `json:"inputText" validate:"required"`
	InputType         string `json:"inputType"`
}

type SaveRequest struct {
	PreviewID string `json:"previewId" validate:"required,len=64,hexadecimal"`
}
