package drift

import (
	"testing"

	"driftledger/server-go/internal/modules/requirement"
)

func TestDetectDoesNotMarkOmittedBaselineAsRemoved(t *testing.T) {
	baseline := []requirement.RequirementSnapshot{
		{RequirementID: "req-1", Title: "User login", Description: "Users can login with email and password"},
	}

	changes := detect(baseline, "Please add dashboard analytics and export reports.")

	for _, change := range changes {
		if change.ChangeType == "removed" {
			t.Fatalf("expected no removed changes when baseline is merely omitted, got %#v", change)
		}
	}
}

func TestDetectExplicitRemovalWithWeakMatchIsRemoved(t *testing.T) {
	baseline := []requirement.RequirementSnapshot{
		{RequirementID: "req-1", Title: "User login", Description: "Users can login with email and password"},
	}

	changes := detect(baseline, "Remove the billing portal from the app.")

	if len(changes) != 1 {
		t.Fatalf("expected one change, got %d", len(changes))
	}
	if changes[0].ChangeType != "removed" {
		t.Fatalf("expected explicit removal to be removed, got %q", changes[0].ChangeType)
	}
}

func TestDetectContradictionWithWeakMatchIsContradiction(t *testing.T) {
	baseline := []requirement.RequirementSnapshot{
		{RequirementID: "req-1", Title: "User login", Description: "Users can login with email and password"},
	}

	changes := detect(baseline, "Instead of passwords, users should authenticate with magic links.")

	if len(changes) != 1 {
		t.Fatalf("expected one change, got %d", len(changes))
	}
	if changes[0].ChangeType != "contradiction" {
		t.Fatalf("expected contradiction, got %q", changes[0].ChangeType)
	}
}

func TestScoreRiskThresholds(t *testing.T) {
	effort := 8.0
	score, risk, counts, hours, _ := Score([]DetectedChange{
		{ChangeType: "added", Impact: "high", EstimatedEffort: &effort},
		{ChangeType: "contradiction", Impact: "critical", EstimatedEffort: &effort},
	})

	if score != 60 {
		t.Fatalf("expected score 60, got %d", score)
	}
	if risk != "high" {
		t.Fatalf("expected high risk, got %q", risk)
	}
	if counts["added"] != 1 || counts["contradiction"] != 1 {
		t.Fatalf("unexpected counts: %#v", counts)
	}
	if hours != 16 {
		t.Fatalf("expected 16 estimated hours, got %.1f", hours)
	}
}
