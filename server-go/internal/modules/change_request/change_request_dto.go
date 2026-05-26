package change_request

type GenerateRequest struct {
	DriftAnalysisID string `json:"driftAnalysisId" validate:"required"`
	UseOllama       bool   `json:"useOllama"`
	OllamaModel     string `json:"ollamaModel"`
}

type SaveRequest = Draft

type UpdateRequest struct {
	Title             string `json:"title"`
	ClientName        string `json:"clientName"`
	Summary           string `json:"summary"`
	BusinessReason    string `json:"businessReason"`
	TimelineImpact    string `json:"timelineImpact"`
	CostImpact        string `json:"costImpact"`
	RecommendedAction string `json:"recommendedAction"`
	ApprovalNote      string `json:"approvalNote"`
	Status            string `json:"status"`
}
