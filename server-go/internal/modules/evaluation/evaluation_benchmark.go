package evaluation

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"driftledger/server-go/internal/modules/drift"
	"driftledger/server-go/internal/modules/project"
	"driftledger/server-go/internal/modules/requirement"
	"driftledger/server-go/internal/modules/workspace"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type benchmarkRequirement struct {
	Title       string
	Description string
}

type benchmarkCase struct {
	ID                 string
	Name               string
	Message            string
	ExpectedLabel      string
	MinScore           int
	MaxScore           int
	MinHours           float64
	MaxHours           float64
	RequiredModules    []string
	SummaryContains    []string
	SummaryNotContains []string
}

var benchmarkRequirements = []benchmarkRequirement{
	{"Patient email login", "The system shall allow patients to log in using their registered email and password."},
	{"Appointment booking", "The system shall allow patients to book appointments with doctors from available clinic slots."},
	{"Appointment cancellation", "The system shall allow patients to cancel appointments up to 24 hours before the scheduled time."},
	{"Prescription PDF download", "The system shall allow patients to download prescription PDFs from their visit history."},
	{"Invoice card payment", "The system shall allow patients to pay invoices using a card payment method."},
	{"Invoice status view", "The system shall allow patients to view invoice and payment status."},
	{"Appointment notifications", "The system shall notify patients about appointment bookings, changes, and cancellations."},
	{"Clinic CSV export", "The system shall allow admins to export clinic reports as CSV files."},
	{"Patient dashboard", "The system shall allow patients to view a dashboard with appointments, prescriptions, invoices, and notifications."},
}

var benchmarkCases = []benchmarkCase{
	{ID: "same_prescription_pdf", Name: "Existing prescription PDF moved to visit history", Message: "Can patients also download the same prescription PDF from their visit history page?", ExpectedLabel: "modified", MaxScore: 15, MaxHours: 3},
	{ID: "sms_otp", Name: "Add SMS OTP as a password reset option", Message: "Also allow patients to reset their password through SMS OTP.", ExpectedLabel: "added", MinScore: 30, MaxScore: 40, MaxHours: 8},
	{ID: "card_payment_removal", Name: "Remove card payments from the first release", Message: "Remove card payment from the first release. Patients will only view invoice and payment status for now.", ExpectedLabel: "removed", MinScore: 40, MaxScore: 70, MaxHours: 8},
	{ID: "family_portal", Name: "Add family access to patient records", Message: "Add family member accounts so relatives can log in and view appointments, prescriptions, invoices, payment status, and notifications for the patient.", ExpectedLabel: "added", MinScore: 50, MaxScore: 75, MinHours: 12, RequiredModules: []string{"Role Management", "Payment Status", "Notifications"}},
	{ID: "appointment_cancel_window", Name: "Shorten the appointment cancellation window", Message: "Allow patients to cancel appointments up to 2 hours before the scheduled time instead of 24 hours.", ExpectedLabel: "modified", MinScore: 30, MaxScore: 55, MaxHours: 12},
	{ID: "appointment_cancel_contradiction", Name: "Allow cancellations after scheduled time", Message: "Patients should be able to cancel appointments anytime, even after the scheduled appointment time.", ExpectedLabel: "contradiction", MinScore: 65, MaxScore: 85, MaxHours: 18},
	{ID: "vague_dashboard", Name: "Clarify an undefined dashboard improvement", Message: "Make the patient dashboard smarter and easier to use.", ExpectedLabel: "ambiguous", MinScore: 20, MaxScore: 40, MaxHours: 6, SummaryNotContains: []string{"implementation-ready", "charts", "filters"}},
	{ID: "clinic_analytics", Name: "Replace CSV exports with clinic analytics dashboards", Message: "Instead of CSV exports, create interactive clinic analytics dashboards with charts, filters, doctor-wise summaries, and downloadable snapshots.", ExpectedLabel: "modified", MinScore: 45, MaxScore: 70, MinHours: 12, SummaryContains: []string{"csv", "clinic analytics"}, SummaryNotContains: []string{"academic", "report card"}},
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

	jsonPath, _, err := s.writeReports(report)
	if err != nil {
		mutateRun(userID, func(run *EvaluationRun) {
			run.Status = runStatusFailed
			run.Error = err.Error()
			run.CurrentStep = "Could not write evaluation report"
			run.FinishedAt = time.Now().UTC().Format(time.RFC3339)
		})
		return
	}

	mutateRun(userID, func(run *EvaluationRun) {
		run.Status = runStatusSucceeded
		run.Progress = run.TotalCases
		run.PassCount = report.PassCount
		run.ReportName = filepath.Base(jsonPath)
		run.CurrentStep = "Evaluation report ready"
		run.FinishedAt = time.Now().UTC().Format(time.RFC3339)
	})
}

func (s Service) runBenchmark(ctx context.Context, userID primitive.ObjectID) (Report, error) {
	if s.db == nil {
		return Report{}, fmt.Errorf("evaluation database is not configured")
	}
	if !s.cfg.DriftInferenceEnabled {
		return Report{}, fmt.Errorf("drift inference is disabled")
	}
	health, err := s.inferenceHealth(ctx)
	if err != nil {
		return Report{}, err
	}

	workspaceID, projectID, versionID, err := s.createSandbox(ctx, userID)
	if err != nil {
		return Report{}, err
	}
	defer s.cleanupSandbox(context.Background(), workspaceID, projectID, versionID)

	driftService := drift.NewService(s.db, drift.NewInferenceClient(s.cfg))
	cases := make([]CaseResult, 0, len(benchmarkCases))
	for index, item := range benchmarkCases {
		caseIndex := index
		mutateRun(userID, func(run *EvaluationRun) {
			run.CurrentStep = "Running " + item.Name
			run.CaseStatuses[caseIndex].Status = runStatusRunning
		})
		result, err := s.runCase(ctx, driftService, userID, projectID, versionID, item)
		if err != nil {
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
	for _, item := range cases {
		if item.Passed {
			passCount++
		}
		latencyTotal += item.LatencyMs
	}
	averageLatency := float64(latencyTotal) / float64(max(len(cases), 1))
	return Report{
		SchemaVersion:    1,
		GeneratedAt:      time.Now().UTC().Format(time.RFC3339),
		Mode:             "q4",
		Model:            modelInfoFromHealth(health),
		PassCount:        passCount,
		CaseCount:        len(cases),
		PassRate:         float64(passCount) / float64(max(len(cases), 1)) * 100,
		AverageLatencyMs: averageLatency,
		Recommendation:   recommendationFor(passCount, len(cases)),
		Cases:            cases,
	}, nil
}

func (s Service) runCase(ctx context.Context, driftService drift.Service, userID, projectID, versionID primitive.ObjectID, item benchmarkCase) (CaseResult, error) {
	started := time.Now()
	analysis, err := driftService.Analyze(ctx, userID, drift.AnalyzeRequest{
		ProjectID:         projectID.Hex(),
		BaselineVersionID: versionID.Hex(),
		InputType:         "client_message",
		InputText:         item.Message,
	})
	if err != nil {
		return CaseResult{}, fmt.Errorf("%s failed: %w", item.Name, err)
	}
	latencyMs := time.Since(started).Milliseconds()
	firstChange := drift.DetectedChange{}
	if len(analysis.DetectedChanges) > 0 {
		firstChange = analysis.DetectedChanges[0]
	}
	actualLabel := actualLabel(analysis, firstChange)
	notes := validateBenchmarkCase(item, analysis, firstChange, actualLabel)
	return CaseResult{
		ID:             item.ID,
		Name:           item.Name,
		ExpectedLabel:  item.ExpectedLabel,
		ActualLabel:    actualLabel,
		Score:          analysis.DriftScore,
		Impact:         firstNonEmpty(firstChange.Impact, analysis.RiskLevel),
		EstimatedHours: analysis.EstimatedExtraHours,
		LatencyMs:      latencyMs,
		Passed:         len(notes) == 0,
		Title:          firstChange.Title,
		Summary:        analysis.Summary,
		Reasoning:      firstChange.Description,
		Notes:          notes,
	}, nil
}

func (s Service) createSandbox(ctx context.Context, userID primitive.ObjectID) (primitive.ObjectID, primitive.ObjectID, primitive.ObjectID, error) {
	now := time.Now().UTC()
	runID := utils.NewID().Hex()
	workspaceID := utils.NewID()
	projectID := utils.NewID()
	versionID := utils.NewID()
	workspaceDoc := workspace.Workspace{ID: workspaceID, Name: "Evaluation Sandbox", Slug: "evaluation-sandbox-" + runID[len(runID)-6:], Owner: userID, CreatedBy: userID, Description: "Temporary benchmark workspace", CreatedAt: now, UpdatedAt: now}
	memberDoc := workspace.WorkspaceMember{ID: utils.NewID(), Workspace: workspaceID, User: userID, Role: "owner", CreatedAt: now, UpdatedAt: now}
	projectDoc := project.Project{ID: projectID, Workspace: workspaceID, Name: "MediCare Clinic Portal", ClientName: "MediCare Clinic", Description: "Temporary Q4 evaluation project", Status: "active", Priority: "medium", OriginalScope: "Clinic portal baseline", CreatedBy: userID, CreatedAt: now, UpdatedAt: now}
	if _, err := s.db.Collection("workspaces").InsertOne(ctx, workspaceDoc); err != nil {
		return primitive.NilObjectID, primitive.NilObjectID, primitive.NilObjectID, err
	}
	if _, err := s.db.Collection("workspacemembers").InsertOne(ctx, memberDoc); err != nil {
		return primitive.NilObjectID, primitive.NilObjectID, primitive.NilObjectID, err
	}
	if _, err := s.db.Collection("projects").InsertOne(ctx, projectDoc); err != nil {
		return primitive.NilObjectID, primitive.NilObjectID, primitive.NilObjectID, err
	}

	snapshots := make([]requirement.RequirementSnapshot, 0, len(benchmarkRequirements))
	requirementDocs := make([]any, 0, len(benchmarkRequirements))
	for _, item := range benchmarkRequirements {
		reqID := utils.NewID()
		req := requirement.Requirement{ID: reqID, Project: projectID, Workspace: workspaceID, Title: item.Title, Description: item.Description, Type: "functional", Priority: "medium", Status: "approved", Source: "evaluation", AcceptanceCriteria: []string{}, Tags: []string{"evaluation"}, IsBaseline: true, BaselineVersion: 1, CreatedBy: userID, UpdatedBy: userID, CreatedAt: now, UpdatedAt: now}
		requirementDocs = append(requirementDocs, req)
		snapshots = append(snapshots, requirement.RequirementSnapshot{RequirementID: reqID.Hex(), Title: item.Title, Description: item.Description, Type: "functional", Priority: "medium", Status: "approved", Source: "evaluation", AcceptanceCriteria: []string{}, Tags: []string{"evaluation"}})
	}
	if _, err := s.db.Collection("requirements").InsertMany(ctx, requirementDocs); err != nil {
		return primitive.NilObjectID, primitive.NilObjectID, primitive.NilObjectID, err
	}
	version := requirement.RequirementVersion{ID: versionID, Project: projectID, Workspace: workspaceID, VersionNumber: 1, Label: "Q4 evaluation baseline", Description: "Automated evaluation benchmark baseline", RequirementsSnapshot: snapshots, CreatedBy: userID, CreatedAt: now}
	if _, err := s.db.Collection("requirementversions").InsertOne(ctx, version); err != nil {
		return primitive.NilObjectID, primitive.NilObjectID, primitive.NilObjectID, err
	}
	return workspaceID, projectID, versionID, nil
}

func (s Service) cleanupSandbox(ctx context.Context, workspaceID, projectID, versionID primitive.ObjectID) {
	_, _ = s.db.Collection("requirementversions").DeleteOne(ctx, bson.M{"_id": versionID})
	_, _ = s.db.Collection("requirements").DeleteMany(ctx, bson.M{"project": projectID})
	_, _ = s.db.Collection("projects").DeleteOne(ctx, bson.M{"_id": projectID})
	_, _ = s.db.Collection("workspacemembers").DeleteMany(ctx, bson.M{"workspace": workspaceID})
	_, _ = s.db.Collection("workspaces").DeleteOne(ctx, bson.M{"_id": workspaceID})
}

func (s Service) writeReports(report Report) (string, string, error) {
	if err := os.MkdirAll(s.reportDir, 0o755); err != nil {
		return "", "", err
	}
	stamp := time.Now().UTC().Format("20060102_150405")
	jsonPath := filepath.Join(s.reportDir, "q4_quality_"+stamp+".json")
	mdPath := filepath.Join(s.reportDir, "q4_quality_"+stamp+".md")
	body, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return "", "", err
	}
	if err := os.WriteFile(jsonPath, body, 0o600); err != nil {
		return "", "", err
	}
	if err := os.WriteFile(mdPath, []byte(markdownReport(report)), 0o600); err != nil {
		return "", "", err
	}
	return jsonPath, mdPath, nil
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

func actualLabel(analysis drift.AnalysisPreview, firstChange drift.DetectedChange) string {
	if firstChange.ChangeType != "" {
		return strings.ToLower(firstChange.ChangeType)
	}
	if analysis.DriftScore <= 15 {
		return "unchanged"
	}
	return "unknown"
}

func validateBenchmarkCase(item benchmarkCase, analysis drift.AnalysisPreview, firstChange drift.DetectedChange, actual string) []string {
	notes := []string{}
	if actual != item.ExpectedLabel {
		notes = append(notes, fmt.Sprintf("expected %s, got %s", item.ExpectedLabel, actual))
	}
	if analysis.DriftScore < item.MinScore {
		notes = append(notes, fmt.Sprintf("score too low: %d", analysis.DriftScore))
	}
	if item.MaxScore > 0 && analysis.DriftScore > item.MaxScore {
		notes = append(notes, fmt.Sprintf("score too high: %d", analysis.DriftScore))
	}
	if analysis.EstimatedExtraHours < item.MinHours {
		notes = append(notes, fmt.Sprintf("hours too low: %.1f", analysis.EstimatedExtraHours))
	}
	if item.MaxHours > 0 && analysis.EstimatedExtraHours > item.MaxHours {
		notes = append(notes, fmt.Sprintf("hours too high: %.1f", analysis.EstimatedExtraHours))
	}
	for _, module := range item.RequiredModules {
		if !contains(firstChange.AffectedModules, module) {
			notes = append(notes, "missing module "+module)
		}
	}
	summary := strings.ToLower(analysis.Summary + " " + firstChange.Description)
	for _, term := range item.SummaryContains {
		if !strings.Contains(summary, term) {
			notes = append(notes, "missing summary term "+term)
		}
	}
	for _, term := range item.SummaryNotContains {
		if strings.Contains(summary, term) {
			notes = append(notes, "forbidden summary term "+term)
		}
	}
	return notes
}

func markdownReport(report Report) string {
	lines := []string{
		"# Q4 Quality Evaluation",
		"",
		"- Generated: " + report.GeneratedAt,
		"- Model: " + report.Model.Label,
		fmt.Sprintf("- Pass rate: %.1f%%", report.PassRate),
		fmt.Sprintf("- Average latency: %.0f ms", report.AverageLatencyMs),
		"",
		"| Case | Expected | Actual | Score | Result |",
		"| --- | --- | --- | ---: | --- |",
	}
	for _, item := range report.Cases {
		status := "pass"
		if !item.Passed {
			status = "fail"
		}
		lines = append(lines, fmt.Sprintf("| %s | %s | %s | %d | %s |", item.Name, item.ExpectedLabel, item.ActualLabel, item.Score, status))
	}
	lines = append(lines, "", "Recommendation: "+report.Recommendation)
	return strings.Join(lines, "\n") + "\n"
}

func recommendationFor(passCount, caseCount int) string {
	if passCount == caseCount {
		return "Q4_K_M passed every automated benchmark case and is ready for the local DriftLedger demo workflow."
	}
	return "Review failed cases before demoing; otherwise the Q4 portfolio runtime is ready for local DriftLedger demos."
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
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

func contains(values []string, expected string) bool {
	for _, value := range values {
		if strings.EqualFold(value, expected) {
			return true
		}
	}
	return false
}

func max(a, b int) int {
	return int(math.Max(float64(a), float64(b)))
}
