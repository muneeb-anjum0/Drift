package billing

import "testing"

func TestBuildSummaryUsesLocalProDemoPlan(t *testing.T) {
	summary := BuildSummary(Counts{Projects: 3, SavedAnalyses: 12, ChangeRequests: 4, Approvals: 2, EvaluationRate: 87.5})

	if summary.PlanName != "DriftLedger Local Pro" || summary.Status != "active_demo" {
		t.Fatalf("unexpected plan metadata %#v", summary)
	}
	if summary.Projects != 3 || summary.SavedAnalyses != 12 || summary.ChangeRequests != 4 || summary.Approvals != 2 {
		t.Fatalf("usage counts were not preserved %#v", summary)
	}
	if !summary.LocalInference || summary.Quantization != "Q4_K_M" {
		t.Fatalf("billing summary must describe the local Q4 runtime %#v", summary)
	}
}
