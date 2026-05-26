package requirement

type CreateRequirementRequest struct {
	ProjectID          string   `json:"projectId" validate:"required"`
	WorkspaceID        string   `json:"workspaceId"`
	Title              string   `json:"title" validate:"required"`
	Description        string   `json:"description"`
	Type               string   `json:"type"`
	Priority           string   `json:"priority"`
	Status             string   `json:"status"`
	Source             string   `json:"source"`
	SourceText         string   `json:"sourceText"`
	AcceptanceCriteria []string `json:"acceptanceCriteria"`
	Tags               []string `json:"tags"`
	EstimatedEffort    *float64 `json:"estimatedEffort"`
}

type UpdateRequirementRequest struct {
	Title              string   `json:"title"`
	Description        string   `json:"description"`
	Type               string   `json:"type"`
	Priority           string   `json:"priority"`
	Status             string   `json:"status"`
	Source             string   `json:"source"`
	SourceText         string   `json:"sourceText"`
	AcceptanceCriteria []string `json:"acceptanceCriteria"`
	Tags               []string `json:"tags"`
	EstimatedEffort    *float64 `json:"estimatedEffort"`
}

type ExtractRequest struct {
	ProjectID  string `json:"projectId" validate:"required"`
	SourceText string `json:"sourceText" validate:"required"`
	Source     string `json:"source"`
}

type BaselineRequest struct {
	ProjectID   string `json:"projectId" validate:"required"`
	Label       string `json:"label"`
	Description string `json:"description"`
}
