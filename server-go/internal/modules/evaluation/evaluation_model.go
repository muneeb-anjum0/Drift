package evaluation

type ModelInfo struct {
	Label         string `json:"label"`
	Quantization  string `json:"quantization"`
	Runtime       string `json:"runtime"`
	Health        string `json:"health"`
	ModelLoaded   bool   `json:"modelLoaded"`
	GGUFModelPath string `json:"ggufModelPath"`
}

type CaseResult struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	ExpectedLabel  string   `json:"expectedLabel"`
	ActualLabel    string   `json:"actualLabel"`
	Confidence     float64  `json:"confidence"`
	Score          int      `json:"score"`
	Impact         string   `json:"impact"`
	EstimatedHours float64  `json:"estimatedHours"`
	LatencyMs      int64    `json:"latencyMs"`
	Passed         bool     `json:"passed"`
	Title          string   `json:"title"`
	Summary        string   `json:"summary"`
	Reasoning      string   `json:"reasoning"`
	Notes          []string `json:"notes"`
}

type RunCaseStatus struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Status        string `json:"status"`
	ExpectedLabel string `json:"expectedLabel"`
	ActualLabel   string `json:"actualLabel,omitempty"`
	Score         int    `json:"score,omitempty"`
	LatencyMs     int64  `json:"latencyMs,omitempty"`
	Passed        bool   `json:"passed,omitempty"`
	Error         string `json:"error,omitempty"`
	CompletedAt   string `json:"completedAt,omitempty"`
}

type EvaluationRun struct {
	ID           string          `json:"id"`
	Status       string          `json:"status"`
	StartedBy    string          `json:"startedBy"`
	StartedAt    string          `json:"startedAt"`
	FinishedAt   string          `json:"finishedAt,omitempty"`
	Progress     int             `json:"progress"`
	TotalCases   int             `json:"totalCases"`
	PassCount    int             `json:"passCount"`
	ReportName   string          `json:"reportName,omitempty"`
	Error        string          `json:"error,omitempty"`
	CurrentStep  string          `json:"currentStep,omitempty"`
	CaseStatuses []RunCaseStatus `json:"caseStatuses"`
	report       *Report
}

type Report struct {
	SchemaVersion     int          `json:"schemaVersion"`
	GeneratedAt       string       `json:"generatedAt"`
	Mode              string       `json:"mode"`
	Model             ModelInfo    `json:"model"`
	PassCount         int          `json:"passCount"`
	CaseCount         int          `json:"caseCount"`
	PassRate          float64      `json:"passRate"`
	AverageLatencyMs  float64      `json:"averageLatencyMs"`
	MaxLatencyMs      int64        `json:"maxLatencyMs"`
	AverageConfidence float64      `json:"averageConfidence"`
	Recommendation    string       `json:"recommendation"`
	Cases             []CaseResult `json:"cases"`
}

type ReportFile struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	CreatedAt string `json:"createdAt"`
}

type ApprovalQuality struct {
	Pending       int64   `json:"pending"`
	Approved      int64   `json:"approved"`
	Rejected      int64   `json:"rejected"`
	NeedsRevision int64   `json:"needsRevision"`
	AverageScore  float64 `json:"averageApprovedScore"`
}

type Summary struct {
	HasReport         bool            `json:"hasReport"`
	LatestReportPath  string          `json:"latestReportPath,omitempty"`
	GeneratedAt       string          `json:"generatedAt,omitempty"`
	Model             ModelInfo       `json:"model"`
	PassCount         int             `json:"passCount"`
	CaseCount         int             `json:"caseCount"`
	PassRate          float64         `json:"passRate"`
	AverageLatencyMs  float64         `json:"averageLatencyMs"`
	MaxLatencyMs      int64           `json:"maxLatencyMs"`
	AverageConfidence float64         `json:"averageConfidence"`
	Recommendation    string          `json:"recommendation,omitempty"`
	Cases             []CaseResult    `json:"cases"`
	Reports           []ReportFile    `json:"reports"`
	ApprovalQuality   ApprovalQuality `json:"approvalQuality"`
	CurrentRun        *EvaluationRun  `json:"currentRun,omitempty"`
}
