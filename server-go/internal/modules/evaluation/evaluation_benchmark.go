package evaluation

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"driftledger/server-go/internal/modules/drift"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type benchmarkCase struct {
	ID                  string
	Name                string
	BaselineRequirement string
	Message             string
	ExpectedLabel       string
	MinConfidence       float64
}

var benchmarkCases = []benchmarkCase{
	{
		ID:                  "same_monthly_report",
		Name:                "Same monthly report from reports page",
		BaselineRequirement: "The system shall allow admins to export monthly reports as CSV.",
		Message:             "Can we also let admins download the same monthly report from the existing reports page?",
		ExpectedLabel:       "unchanged",
		MinConfidence:       0.55,
	},
	{
		ID:                  "sms_password_reset",
		Name:                "SMS OTP password reset",
		BaselineRequirement: "The system shall allow users to reset their password by email.",
		Message:             "Also allow users to reset their password through SMS OTP.",
		ExpectedLabel:       "added",
		MinConfidence:       0.45,
	},
	{
		ID:                  "shorter_cancel_window",
		Name:                "Shorter cancellation window",
		BaselineRequirement: "The system shall allow patients to cancel appointments up to 24 hours before the scheduled time.",
		Message:             "Allow patients to cancel appointments up to 2 hours before the scheduled time instead of 24 hours.",
		ExpectedLabel:       "modified",
		MinConfidence:       0.45,
	},
	{
		ID:                  "remove_card_payment",
		Name:                "Remove first-release card payment",
		BaselineRequirement: "The system shall allow patients to pay invoices using a card payment method.",
		Message:             "Remove card payment from the first release. Patients will only view invoice and payment status for now.",
		ExpectedLabel:       "removed",
		MinConfidence:       0.45,
	},
	{
		ID:                  "cancel_after_appointment",
		Name:                "Cancel after appointment time",
		BaselineRequirement: "The system shall allow patients to cancel appointments only before the scheduled appointment time.",
		Message:             "Patients should be able to cancel appointments even after the scheduled appointment time.",
		ExpectedLabel:       "contradiction",
		MinConfidence:       0.40,
	},
	{
		ID:                  "vague_dashboard",
		Name:                "Vague dashboard improvement",
		BaselineRequirement: "The system shall allow patients to view a dashboard with appointments, prescriptions, invoices, and notifications.",
		Message:             "Make the patient dashboard smarter and easier to use.",
		ExpectedLabel:       "ambiguous",
		MinConfidence:       0.35,
	},
	{
		ID:                  "family_member_access",
		Name:                "Family member portal access",
		BaselineRequirement: "The system shall allow patients to view their own appointments, prescriptions, invoices, and notifications.",
		Message:             "Add family member accounts so relatives can log in and view appointments, prescriptions, invoices, and notifications for the patient.",
		ExpectedLabel:       "added",
		MinConfidence:       0.45,
	},
	{
		ID:                  "clinic_analytics",
		Name:                "CSV export to analytics dashboard",
		BaselineRequirement: "The system shall allow admins to export clinic reports as CSV files.",
		Message:             "Instead of CSV exports, create interactive clinic analytics dashboards with charts, filters, doctor-wise summaries, and downloadable snapshots.",
		ExpectedLabel:       "modified",
		MinConfidence:       0.45,
	},
	{
		ID:                  "document_upload",
		Name:                "Project document upload",
		BaselineRequirement: "The system shall allow project managers to attach scope notes to a project.",
		Message:             "Can project managers upload signed PDF scope documents and keep them linked to the project?",
		ExpectedLabel:       "added",
		MinConfidence:       0.40,
	},
	{
		ID:                  "notification_channel",
		Name:                "WhatsApp notification channel",
		BaselineRequirement: "The system shall notify patients about appointment bookings, changes, and cancellations by email.",
		Message:             "Send the same appointment notifications through WhatsApp as well.",
		ExpectedLabel:       "added",
		MinConfidence:       0.40,
	},
}

func benchmarkCaseStatuses() []RunCaseStatus {
	out := make([]RunCaseStatus, 0, len(benchmarkCases))
	for _, item := range benchmarkCases {
		out = append(out, RunCaseStatus{ID: item.ID, Name: item.Name, Status: runStatusQueued, ExpectedLabel: item.ExpectedLabel})
	}
	return out
}

func (s Service) RunEvaluation(ctx context.Context, userID primitive.ObjectID, runID string) {
	mutateRun(userID, func(run *EvaluationRun) {
		run.Status = runStatusRunning
		run.CurrentStep = "Checking local inference runtime"
	})

	report, err := s.runBenchmark(ctx, userID)
	if err != nil {
		mutateRun(userID, func(run *EvaluationRun) {
			run.Status = runStatusFailed
			run.Error = err.Error()
			run.CurrentStep = "Evaluation failed"
			run.FinishedAt = time.Now().UTC().Format(time.RFC3339)
		})
		return
	}

	mutateRun(userID, func(run *EvaluationRun) {
		run.Status = runStatusSucceeded
		run.Progress = run.TotalCases
		run.PassCount = report.PassCount
		run.CurrentStep = "Evaluation complete"
		run.FinishedAt = time.Now().UTC().Format(time.RFC3339)
		run.report = &report
	})
}

func (s Service) runBenchmark(ctx context.Context, userID primitive.ObjectID) (Report, error) {
	if !s.cfg.DriftInferenceEnabled {
		return Report{}, fmt.Errorf("drift inference is disabled")
	}
	health, err := s.inferenceHealth(ctx)
	if err != nil {
		return Report{}, err
	}

	driftService := drift.NewService(s.db, drift.NewInferenceClient(s.cfg))
	cases := make([]CaseResult, 0, len(benchmarkCases))
	for index, item := range benchmarkCases {
		caseIndex := index
		mutateRun(userID, func(run *EvaluationRun) {
			run.CurrentStep = "Running " + item.Name
			run.CaseStatuses[caseIndex].Status = runStatusRunning
		})
		result, err := s.runCase(ctx, driftService, item)
		if err != nil {
			mutateRun(userID, func(run *EvaluationRun) {
				run.CaseStatuses[caseIndex].Status = runStatusFailed
				run.CaseStatuses[caseIndex].Error = err.Error()
			})
			return Report{}, err
		}
		cases = append(cases, result)
		mutateRun(userID, func(run *EvaluationRun) {
			run.Progress = caseIndex + 1
			if result.Passed {
				run.PassCount++
			}
			run.CaseStatuses[caseIndex].Status = runStatusSucceeded
			run.CaseStatuses[caseIndex].ActualLabel = result.ActualLabel
			run.CaseStatuses[caseIndex].Score = result.Score
			run.CaseStatuses[caseIndex].LatencyMs = result.LatencyMs
			run.CaseStatuses[caseIndex].Passed = result.Passed
			run.CaseStatuses[caseIndex].CompletedAt = time.Now().UTC().Format(time.RFC3339)
		})
	}

	passCount := 0
	var latencyTotal int64
	var maxLatency int64
	var confidenceTotal float64
	for _, item := range cases {
		if item.Passed {
			passCount++
		}
		latencyTotal += item.LatencyMs
		if item.LatencyMs > maxLatency {
			maxLatency = item.LatencyMs
		}
		confidenceTotal += item.Confidence
	}
	caseCount := len(cases)
	return Report{
		SchemaVersion:     1,
		GeneratedAt:       time.Now().UTC().Format(time.RFC3339),
		Mode:              "q4",
		Model:             modelInfoFromHealth(health),
		PassCount:         passCount,
		CaseCount:         caseCount,
		PassRate:          float64(passCount) / float64(max(caseCount, 1)) * 100,
		AverageLatencyMs:  float64(latencyTotal) / float64(max(caseCount, 1)),
		MaxLatencyMs:      maxLatency,
		AverageConfidence: confidenceTotal / float64(max(caseCount, 1)),
		Recommendation:    recommendationFor(passCount, caseCount),
		Cases:             cases,
	}, nil
}

func (s Service) runCase(ctx context.Context, driftService drift.Service, item benchmarkCase) (CaseResult, error) {
	started := time.Now()
	prediction, err := driftService.AnalyzeDirect(ctx, drift.ModelAnalyzeRequest{
		BaselineRequirement: item.BaselineRequirement,
		NewClientMessage:    item.Message,
	})
	if err != nil {
		return CaseResult{}, fmt.Errorf("%s failed: %w", item.Name, err)
	}
	latencyMs := time.Since(started).Milliseconds()
	actual := strings.ToLower(strings.TrimSpace(prediction.Label))
	score := evalScore(actual)
	notes := validateBenchmarkCase(item, prediction, actual)
	return CaseResult{
		ID:             item.ID,
		Name:           item.Name,
		ExpectedLabel:  item.ExpectedLabel,
		ActualLabel:    actual,
		Confidence:     prediction.Confidence,
		Score:          score,
		Impact:         evalImpact(actual),
		EstimatedHours: evalHours(actual),
		LatencyMs:      latencyMs,
		Passed:         len(notes) == 0,
		Title:          evalTitle(item, prediction),
		Summary:        prediction.Reasoning,
		Reasoning:      prediction.Reasoning,
		Notes:          notes,
	}, nil
}

func (s Service) inferenceHealth(ctx context.Context) (map[string]any, error) {
	url := strings.TrimRight(s.cfg.DriftInferenceURL, "/") + "/health"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: s.cfg.DriftInferenceTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("inference health check failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("inference health check returned status %d", resp.StatusCode)
	}
	var health map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&health); err != nil {
		return nil, err
	}
	if loaded, _ := health["model_loaded"].(bool); !loaded {
		return nil, fmt.Errorf("model is not loaded")
	}
	return health, nil
}

func validateBenchmarkCase(item benchmarkCase, prediction drift.ModelPrediction, actual string) []string {
	notes := []string{}
	if actual != item.ExpectedLabel {
		notes = append(notes, fmt.Sprintf("expected %s, got %s", item.ExpectedLabel, actual))
	}
	if prediction.Confidence < item.MinConfidence {
		notes = append(notes, fmt.Sprintf("confidence too low: %.2f", prediction.Confidence))
	}
	if strings.TrimSpace(prediction.Reasoning) == "" {
		notes = append(notes, "missing reasoning")
	}
	return notes
}

func modelInfoFromHealth(health map[string]any) ModelInfo {
	return ModelInfo{
		Label:         stringAt(health, "model_label", "Qwen2.5-7B + DriftLedger LoRA (GGUF Q4_K_M)"),
		Quantization:  stringAt(health, "quantization_label", "Q4_K_M"),
		Runtime:       "Local GGUF / llama.cpp",
		Health:        stringAt(health, "status", "unknown"),
		ModelLoaded:   boolAt(health, "model_loaded"),
		GGUFModelPath: stringAt(health, "gguf_model_path", ""),
	}
}

func evalScore(label string) int {
	switch label {
	case "contradiction":
		return 80
	case "removed":
		return 60
	case "modified":
		return 45
	case "added":
		return 35
	case "ambiguous":
		return 25
	default:
		return 0
	}
}

func evalImpact(label string) string {
	switch label {
	case "contradiction", "removed":
		return "high"
	case "modified", "ambiguous":
		return "medium"
	case "added":
		return "low"
	default:
		return "none"
	}
}

func evalHours(label string) float64 {
	switch label {
	case "contradiction":
		return 8
	case "removed":
		return 4
	case "modified":
		return 6
	case "added":
		return 5
	case "ambiguous":
		return 2
	default:
		return 0
	}
}

func evalTitle(item benchmarkCase, prediction drift.ModelPrediction) string {
	if len(prediction.ChangedElements) > 0 && strings.TrimSpace(prediction.ChangedElements[0]) != "" {
		return prediction.ChangedElements[0]
	}
	return item.Name
}

func recommendationFor(passCount, caseCount int) string {
	if passCount == caseCount {
		return "All focused Q4_K_M benchmark cases passed."
	}
	return "Review failed cases before using this runtime in a polished demo."
}

func stringAt(values map[string]any, key, fallback string) string {
	if value, ok := values[key].(string); ok && value != "" {
		return value
	}
	return fallback
}

func boolAt(values map[string]any, key string) bool {
	value, _ := values[key].(bool)
	return value
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
