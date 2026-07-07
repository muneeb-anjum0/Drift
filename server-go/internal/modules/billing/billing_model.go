package billing

type Summary struct {
	PlanName       string  `json:"planName"`
	Status         string  `json:"status"`
	Price          string  `json:"price"`
	RenewalDate    string  `json:"renewalDate"`
	Projects       int64   `json:"projects"`
	SavedAnalyses  int64   `json:"savedAnalyses"`
	ChangeRequests int64   `json:"changeRequests"`
	Approvals      int64   `json:"approvals"`
	EvaluationRate float64 `json:"evaluationPassRate"`
	LocalInference bool    `json:"localInference"`
	Model          string  `json:"model"`
	Quantization   string  `json:"quantization"`
	RuntimeNote    string  `json:"runtimeNote"`
}

type Counts struct {
	Projects       int64
	SavedAnalyses  int64
	ChangeRequests int64
	Approvals      int64
	EvaluationRate float64
}
