package change_request

import (
	"strings"
	"testing"

	"driftledger/server-go/internal/modules/drift"
)

func TestChangeRequestDraftUsesGroupedParentChange(t *testing.T) {
	hours := 18.0
	changes := []drift.DetectedChange{{
		Title:           "Add Parent Portal Access",
		Description:     "The client requested parent accounts so parents can log in and view relevant student information for their children.",
		ChangeType:      "added",
		Impact:          "high",
		AffectedModules: []string{"Authentication", "Role management", "Attendance", "Grades", "Fees", "Notifications"},
		EstimatedEffort: &hours,
	}}

	if got := changeRequestTitle("EduTrack Student Portal", changes); got != "Add Parent Portal Access" {
		t.Fatalf("expected specific parent title, got %q", got)
	}
	if reason := businessReason(changes); !strings.Contains(strings.ToLower(reason), "parent access") {
		t.Fatalf("expected parent business reason, got %q", reason)
	}
	requested := changeRequestChanges(changes)
	if len(requested) != 1 {
		t.Fatalf("expected one requested change, got %#v", requested)
	}
	if len(requested[0].AffectedModules) < 4 {
		t.Fatalf("expected affected modules to be preserved, got %#v", requested[0])
	}
	if !strings.Contains(timelineImpact(groupedHours(changes)), "18") {
		t.Fatalf("expected grouped timeline hours, got %q", timelineImpact(groupedHours(changes)))
	}
}

func TestChangeRequestDraftFramesAmbiguousAsClarification(t *testing.T) {
	hours := 4.0
	changes := []drift.DetectedChange{{
		Title:           "Clarify Student Dashboard Improvements",
		Description:     "The client request is vague and needs clearer acceptance criteria.",
		ChangeType:      "ambiguous",
		Impact:          "medium",
		EstimatedEffort: &hours,
	}}

	if action := recommendedAction(changes); !strings.Contains(strings.ToLower(action), "clarify") {
		t.Fatalf("expected clarification action, got %q", action)
	}
	if note := approvalNote(changes); !strings.Contains(strings.ToLower(note), "clarification") {
		t.Fatalf("expected clarification approval note, got %q", note)
	}
}
