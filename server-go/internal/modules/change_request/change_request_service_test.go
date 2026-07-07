package change_request

import (
	"errors"
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

func TestChangeRequestDraftUsesClinicDomainLanguage(t *testing.T) {
	hours := 18.0
	changes := []drift.DetectedChange{{
		Title:           "Replace CSV Reports With Interactive Clinic Analytics",
		Description:     "The client requested replacing CSV exports with interactive clinic analytics dashboards.",
		ChangeType:      "modified",
		Impact:          "high",
		EstimatedEffort: &hours,
	}}

	reason := strings.ToLower(businessReason(changes))
	if !strings.Contains(reason, "clinic reporting") || !strings.Contains(reason, "csv") {
		t.Fatalf("expected clinic reporting business reason, got %q", reason)
	}
	if strings.Contains(reason, "student") || strings.Contains(reason, "academic") {
		t.Fatalf("business reason leaked education wording: %q", reason)
	}
}

func TestChangeRequestDraftUsesFamilyPortalLanguage(t *testing.T) {
	hours := 18.0
	changes := []drift.DetectedChange{{
		Title:           "Add Family Member Portal Access",
		Description:     "The client requested family member accounts so relatives can log in and view patient information.",
		ChangeType:      "added",
		Impact:          "high",
		EstimatedEffort: &hours,
	}}

	reason := strings.ToLower(businessReason(changes))
	if !strings.Contains(reason, "family member access") || !strings.Contains(reason, "privacy") {
		t.Fatalf("expected family portal business reason, got %q", reason)
	}
}

func TestApprovalTransitionRequiresPendingBeforeDecision(t *testing.T) {
	if err := validateApprovalTransition("", ApprovalPending); err != nil {
		t.Fatalf("expected draft request to submit for approval: %v", err)
	}
	if err := validateApprovalTransition(ApprovalPending, ApprovalApproved); err != nil {
		t.Fatalf("expected pending request to approve: %v", err)
	}
	if err := validateApprovalTransition(ApprovalApproved, ApprovalRejected); !errors.Is(err, ErrInvalidApprovalAction) {
		t.Fatalf("expected approved request to reject invalidly, got %v", err)
	}
}

func TestNeedsRevisionCanBeResubmitted(t *testing.T) {
	if err := validateApprovalTransition(ApprovalPending, ApprovalNeedsRevision); err != nil {
		t.Fatalf("expected pending request to move to revision: %v", err)
	}
	if err := validateApprovalTransition(ApprovalNeedsRevision, ApprovalPending); err != nil {
		t.Fatalf("expected revision request to resubmit: %v", err)
	}
}
