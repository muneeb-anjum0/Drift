package drift

import (
	"strings"
	"testing"
)

func TestCleanReasoningRemovesDuplicateSentences(t *testing.T) {
	input := "The new message introduces a new user role (parent) and a set of new features. The new message introduces a new user role (parent) and a new set of features."

	cleaned := CleanReasoning(input)

	if strings.Count(cleaned, "new user role") != 1 {
		t.Fatalf("expected duplicate reasoning to be removed, got %q", cleaned)
	}
}

func TestParentPortalChangesAreGrouped(t *testing.T) {
	message := "Add parent accounts so parents can log in and view attendance, grades, fee status, and notifications for their children."
	effort := 2.0
	changes := []DetectedChange{
		{ChangeType: "added", Title: "parent accounts", Description: "The new message introduces parent accounts.", Impact: "low", EstimatedEffort: &effort, Confidence: 92, NewText: message, BaselineRequirementTitle: "Attendance view"},
		{ChangeType: "added", Title: "parent accounts", Description: "The new message introduces parent accounts.", Impact: "low", EstimatedEffort: &effort, Confidence: 91, NewText: message, BaselineRequirementTitle: "Grade viewing"},
		{ChangeType: "added", Title: "parent accounts", Description: "The new message introduces parent accounts.", Impact: "low", EstimatedEffort: &effort, Confidence: 90, NewText: message, BaselineRequirementTitle: "Student notifications"},
	}

	grouped, score, _, counts, hours, summary := CleanAnalysis(changes, message)

	if len(grouped) != 1 {
		t.Fatalf("expected one grouped parent change, got %#v", grouped)
	}
	if grouped[0].Title != "Add Parent Portal Access" {
		t.Fatalf("unexpected title %q", grouped[0].Title)
	}
	if grouped[0].Impact == "low" {
		t.Fatalf("expected non-low parent impact")
	}
	if len(grouped[0].AffectedModules) < 4 {
		t.Fatalf("expected multiple affected modules, got %#v", grouped[0].AffectedModules)
	}
	if counts["added"] != 1 {
		t.Fatalf("expected one added count, got %#v", counts)
	}
	if hours < 12 || hours > 24 {
		t.Fatalf("expected grouped parent hours in 12-24 range, got %.1f", hours)
	}
	if score < 50 {
		t.Fatalf("expected medium/high parent score, got %d", score)
	}
	if strings.Count(summary, "parent accounts") > 1 {
		t.Fatalf("summary still looks repeated: %q", summary)
	}
}

func TestCanonicalGroupingCases(t *testing.T) {
	tests := []struct {
		name      string
		message   string
		label     string
		title     string
		minScore  int
		minHours  float64
		maxHours  float64
		notImpact string
	}{
		{
			name:     "sms otp",
			message:  "Also allow students to reset their password through SMS OTP.",
			label:    "added",
			title:    "Add SMS OTP Password Reset",
			minScore: 30,
			minHours: 2,
			maxHours: 8,
		},
		{
			name:     "late submission",
			message:  "Change assignment submissions so students can submit up to 24 hours after the due date with a late penalty.",
			label:    "modified",
			title:    "Modify Assignment Submission Deadline Policy",
			minScore: 30,
			minHours: 4,
			maxHours: 12,
		},
		{
			name:      "remove card payment",
			message:   "Remove card payment from the first release. Students will only view fee status for now.",
			label:     "removed",
			title:     "Remove Card Payment From First Release",
			minScore:  40,
			minHours:  2,
			maxHours:  8,
			notImpact: "low",
		},
		{
			name:      "interactive reports",
			message:   "Instead of PDF academic reports, generate interactive web-based report cards with charts, filters, and downloadable summaries.",
			label:     "modified",
			title:     "Replace PDF Reports With Interactive Report Cards",
			minScore:  45,
			minHours:  12,
			maxHours:  24,
			notImpact: "low",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			effort := 2.0
			grouped, score, _, _, hours, _ := CleanAnalysis([]DetectedChange{{
				ChangeType:      tt.label,
				Title:           tt.message,
				Description:     tt.message,
				Impact:          "low",
				EstimatedEffort: &effort,
				Confidence:      95,
				NewText:         tt.message,
			}}, tt.message)
			if len(grouped) != 1 {
				t.Fatalf("expected one grouped change, got %#v", grouped)
			}
			if grouped[0].Title != tt.title || grouped[0].ChangeType != tt.label {
				t.Fatalf("unexpected grouped change %#v", grouped[0])
			}
			if tt.notImpact != "" && grouped[0].Impact == tt.notImpact {
				t.Fatalf("expected impact not %q", tt.notImpact)
			}
			if score < tt.minScore {
				t.Fatalf("expected score >= %d, got %d", tt.minScore, score)
			}
			if hours < tt.minHours || hours > tt.maxHours {
				t.Fatalf("expected hours %.1f-%.1f, got %.1f", tt.minHours, tt.maxHours, hours)
			}
		})
	}
}

func TestSameReportAccessStaysLowImpact(t *testing.T) {
	message := "Can students also download the same academic report from the reports page instead of only from the dashboard?"
	effort := 2.0

	grouped, score, _, _, _, _ := CleanAnalysis([]DetectedChange{{
		ChangeType:      "modified",
		Title:           "same academic report",
		Description:     "same report from reports page",
		Impact:          "low",
		EstimatedEffort: &effort,
		Confidence:      90,
		NewText:         message,
	}}, message)

	if len(grouped) != 1 {
		t.Fatalf("expected one minor grouped change, got %#v", grouped)
	}
	if grouped[0].Impact != "low" || score > 20 {
		t.Fatalf("expected same-report access to stay low/trivial, got score=%d change=%#v", score, grouped[0])
	}
}
