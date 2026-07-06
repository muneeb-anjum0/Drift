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

	if score != 97 {
		t.Fatalf("expected score 97, got %d", score)
	}
	if risk != "critical" {
		t.Fatalf("expected critical risk, got %q", risk)
	}
	if counts["added"] != 1 || counts["contradiction"] != 1 {
		t.Fatalf("unexpected counts: %#v", counts)
	}
	if hours != 16 {
		t.Fatalf("expected 16 estimated hours, got %.1f", hours)
	}
}

func TestScoreRequirementRelevanceMatchesExpectedDomains(t *testing.T) {
	tests := []struct {
		name       string
		req        requirement.RequirementSnapshot
		message    string
		minScore   float64
		relevant   bool
		domainName string
	}{
		{
			name:       "password reset vs sms otp",
			req:        requirement.RequirementSnapshot{Title: "Email password reset", Description: "The system shall allow users to reset their password by email."},
			message:    "Also add password reset through SMS OTP.",
			minScore:   0.45,
			relevant:   true,
			domainName: "authentication",
		},
		{
			name:       "monthly report vs download report",
			req:        requirement.RequirementSnapshot{Title: "Monthly report CSV export", Description: "The system shall allow admins to export monthly reports as CSV."},
			message:    "Can we also let admins download the same monthly report from the existing reports page?",
			minScore:   0.45,
			relevant:   true,
			domainName: "reports_exports",
		},
		{
			name:       "weekly monthly usage report",
			req:        requirement.RequirementSnapshot{Title: "Monthly report CSV export", Description: "The system shall allow admins to export monthly reports as CSV."},
			message:    "Make the usage reports monthly instead of weekly.",
			minScore:   0.25,
			relevant:   true,
			domainName: "reports_exports",
		},
		{
			name:       "invoice pdf removal",
			req:        requirement.RequirementSnapshot{Title: "Invoice PDF export", Description: "The system shall allow users to export invoices as PDF."},
			message:    "Remove the invoice PDF export feature.",
			minScore:   0.45,
			relevant:   true,
			domainName: "billing",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := scoreRequirementRelevance(tt.req, tt.message, 0.25)
			if result.IsRelevant != tt.relevant {
				t.Fatalf("expected relevant=%v, got %#v", tt.relevant, result)
			}
			if result.Score < tt.minScore {
				t.Fatalf("expected score >= %.2f, got %.3f (%#v)", tt.minScore, result.Score, result)
			}
			if !contains(result.MatchedDomains, tt.domainName) {
				t.Fatalf("expected domain %q in %#v", tt.domainName, result.MatchedDomains)
			}
		})
	}
}

func TestScoreRequirementRelevanceRejectsUnrelatedRequirements(t *testing.T) {
	tests := []struct {
		name    string
		req     requirement.RequirementSnapshot
		message string
	}{
		{
			name:    "password reset vs monthly report",
			req:     requirement.RequirementSnapshot{Title: "Email password reset", Description: "The system shall allow users to reset their password by email."},
			message: "Can we also let admins download the same monthly report from the existing reports page?",
		},
		{
			name:    "monthly report vs sms otp",
			req:     requirement.RequirementSnapshot{Title: "Monthly report CSV export", Description: "The system shall allow admins to export monthly reports as CSV."},
			message: "Also add password reset through SMS OTP.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := scoreRequirementRelevance(tt.req, tt.message, 0.25)
			if result.IsRelevant {
				t.Fatalf("expected unrelated result, got %#v", result)
			}
			if result.Score >= 0.25 {
				t.Fatalf("expected score below threshold, got %.3f", result.Score)
			}
		})
	}
}

func TestNormalizePredictionKeepsSameExistingReportUnchanged(t *testing.T) {
	prediction := ModelPrediction{Label: "added", Confidence: 0.95, Reasoning: "download requested", ChangedElements: []string{"Monthly report download"}}
	relevance := RelevanceResult{MatchedDomains: []string{"reports_exports"}}

	normalized := normalizePredictionForRelevantRequirement(
		prediction,
		relevance,
		"The system shall allow admins to export monthly reports as CSV.",
		"Can we also let admins download the same monthly report from the existing reports page?",
	)

	if normalized.Label != "unchanged" {
		t.Fatalf("expected unchanged, got %#v", normalized)
	}
	if len(normalized.ChangedElements) != 0 {
		t.Fatalf("expected changed elements to be cleared, got %#v", normalized.ChangedElements)
	}
}

func contains(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}
