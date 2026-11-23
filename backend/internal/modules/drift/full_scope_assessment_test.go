package drift

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"

	"driftledger/backend/internal/modules/requirement"
)

type scriptedScopeProvider struct {
	calls      int
	incomplete bool
}

type repairingScopeProvider struct {
	scriptedScopeProvider
	finalCalls int
}

func (p *repairingScopeProvider) AssessScope(_ context.Context, system string, data []byte) (json.RawMessage, error) {
	p.calls++
	if system == scopePairsSystemV1 {
		var input struct {
			RequestText string `json:"requestText"`
		}
		_ = json.Unmarshal(data, &input)
		return json.Marshal(pairBatchResult{SchemaVersion: "scope-pairs-v1", RequestText: input.RequestText, ScopeSummary: "Export format changes", Pairs: []ScopePairAssessment{{RequirementID: "r0", Relation: "modifies", Explanation: "A new export format extends the existing export requirement"}}})
	}
	p.finalCalls++
	var input struct {
		RequestText string `json:"requestText"`
	}
	_ = json.Unmarshal(data, &input)
	score := 25.0
	change := ScopeProposedChange{ChangeType: "added", Impact: "low", Title: "PDF export", ProposedText: input.RequestText, EvidenceIDs: []string{"r0"}, Explanation: "PDF is a new format"}
	if p.finalCalls == 2 {
		change.ChangeType = "modified"
		change.RequirementID = "r0"
	}
	return json.Marshal(ScopeAssessmentV1{SchemaVersion: "scope-assessment-v1", RequestText: input.RequestText, Changes: []ScopeProposedChange{change}, MarginalDriftScore: &score, CumulativeDriftScore: &score, ScoreExplanation: "Extends an existing export format", RiskLevel: "low", Effort: ScopeEffortAssessment{Status: "not_estimable", Questions: []string{"What export library is used?"}}})
}

func (*scriptedScopeProvider) Enabled() bool                { return true }
func (*scriptedScopeProvider) Health(context.Context) error { return nil }
func (*scriptedScopeProvider) Predict(context.Context, ModelAnalyzeRequest) (ModelPrediction, error) {
	return ModelPrediction{}, nil
}
func (*scriptedScopeProvider) RelevanceThreshold() float64  { return 0 }
func (*scriptedScopeProvider) MaxAnalyzedRequirements() int { return 0 }
func (*scriptedScopeProvider) ProviderName() string         { return "local" }
func (*scriptedScopeProvider) ModelName() string            { return "scripted" }
func (p *scriptedScopeProvider) AssessScope(_ context.Context, system string, data []byte) (json.RawMessage, error) {
	p.calls++
	var input struct {
		RequestText  string                            `json:"requestText"`
		Requirements []requirement.RequirementSnapshot `json:"requirements"`
	}
	if err := json.Unmarshal(data, &input); err != nil {
		return nil, err
	}
	if system == scopePairsSystemV1 {
		pairs := make([]ScopePairAssessment, 0, len(input.Requirements))
		for _, item := range input.Requirements {
			pairs = append(pairs, ScopePairAssessment{RequirementID: item.RequirementID, Relation: "unrelated", Explanation: "This item does not cover delivery slots"})
		}
		if p.incomplete {
			pairs = pairs[:len(pairs)-1]
		}
		out, _ := json.Marshal(pairBatchResult{SchemaVersion: "scope-pairs-v1", RequestText: input.RequestText, ScopeSummary: "This batch matches original scope.", Pairs: pairs})
		return out, nil
	}
	if system != scopeSynthesisSystemV1 {
		return nil, fmt.Errorf("unexpected system prompt")
	}
	score := 30.0
	out, _ := json.Marshal(ScopeAssessmentV1{SchemaVersion: "scope-assessment-v1", RequestText: input.RequestText, Changes: []ScopeProposedChange{{ChangeType: "added", Impact: "medium", Title: "Delivery slots", ProposedText: input.RequestText, EvidenceIDs: []string{"r0"}, Explanation: "No current requirement covers it"}}, MarginalDriftScore: &score, CumulativeDriftScore: &score, ScoreExplanation: "Adds scheduling", RiskLevel: "medium", Effort: ScopeEffortAssessment{Status: "not_estimable", Questions: []string{"What scheduling system?"}}})
	return out, nil
}

func TestFullScopeBatchesEveryRequirement(t *testing.T) {
	items := make([]requirement.RequirementSnapshot, 20)
	for i := range items {
		items[i] = requirement.RequirementSnapshot{RequirementID: fmt.Sprintf("r%d", i), Title: "Original"}
	}
	p := &scriptedScopeProvider{}
	assessment, err := assessFullScope(context.Background(), p, items, items, "Add delivery slots")
	if err != nil {
		t.Fatal(err)
	}
	if len(assessment.Pairs) != 20 || p.calls != 5 {
		t.Fatalf("got %d pairs over %d calls", len(assessment.Pairs), p.calls)
	}
	bad := &scriptedScopeProvider{incomplete: true}
	if _, err := assessFullScope(context.Background(), bad, items, items, "Add delivery slots"); !errors.Is(err, ErrIncompleteScopeAssessment) {
		t.Fatalf("incomplete evidence passed: %v", err)
	}
}

func TestFullScopeCoversOneHundredRequirements(t *testing.T) {
	items := make([]requirement.RequirementSnapshot, 100)
	for i := range items {
		items[i] = requirement.RequirementSnapshot{RequirementID: fmt.Sprintf("r%d", i), Title: fmt.Sprintf("Feature %d", i)}
	}
	p := &scriptedScopeProvider{}
	result, err := assessFullScope(context.Background(), p, items[:20], items, "Add delivery slots")
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Pairs) != 100 || p.calls != 18 {
		t.Fatalf("100-item comparison checked %d IDs in %d calls", len(result.Pairs), p.calls)
	}
}

func TestSynthesisRetriesOneInconsistentAnswerWithoutFabricatingAChange(t *testing.T) {
	item := requirement.RequirementSnapshot{RequirementID: "r0", Title: "Monthly report CSV export"}
	p := &repairingScopeProvider{}
	result, err := assessFullScope(context.Background(), p, []requirement.RequirementSnapshot{item}, []requirement.RequirementSnapshot{item}, "Also export the report as PDF")
	if err != nil {
		t.Fatal(err)
	}
	if p.calls != 3 || len(result.Changes) != 1 || result.Changes[0].ChangeType != "modified" || result.Changes[0].RequirementID != "r0" {
		t.Fatalf("retry did not produce a consistent anchored change: calls=%d changes=%#v", p.calls, result.Changes)
	}
}
