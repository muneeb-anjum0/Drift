package drift

import (
	"driftledger/backend/internal/modules/requirement"
	"testing"
)

func TestScopeAssessmentRequiresCompleteEvidence(t *testing.T) {
	score := 20.0
	a := ScopeAssessmentV1{SchemaVersion: "scope-assessment-v1", RequestText: "Add delivery slots", Pairs: []ScopePairAssessment{{RequirementID: "a", Relation: "unrelated", OldQuote: "Orders", NewQuote: "delivery slots", Explanation: "Not covered"}, {RequirementID: "b", Relation: "unrelated", Explanation: "Not covered"}}, Changes: []ScopeProposedChange{{ChangeType: "added", Impact: "low", Title: "Delivery slots", ProposedText: "Add delivery slots", EvidenceIDs: []string{"a", "b"}, Explanation: "New capability"}}, MarginalDriftScore: &score, CumulativeDriftScore: &score, ScoreExplanation: "New delivery scheduling capability", RiskLevel: "low", Effort: ScopeEffortAssessment{Status: "not_estimable", Questions: []string{"What calendar integration is needed?"}}}
	snapshot := []requirement.RequirementSnapshot{{RequirementID: "a", Title: "Orders"}, {RequirementID: "b", Title: "Account login"}}
	if err := ValidateScopeAssessment(a, a.RequestText, snapshot); err != nil {
		t.Fatalf("valid assessment: %v", err)
	}
	a.Pairs[0].Relation = "covered"
	if err := ValidateScopeAssessment(a, a.RequestText, snapshot); err == nil {
		t.Fatal("an addition contradicted by a covered pair passed")
	}
	a.Pairs[0].Relation = "unrelated"
	a.Pairs = a.Pairs[:1]
	if err := ValidateScopeAssessment(a, a.RequestText, snapshot); err == nil {
		t.Fatal("incomplete snapshot passed")
	}
}
