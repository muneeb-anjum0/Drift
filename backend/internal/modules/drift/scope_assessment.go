package drift

import (
	"errors"
	"fmt"
	"math"
	"strings"

	"driftledger/backend/internal/modules/requirement"
)

// ScopeAssessmentV1 is the semantic result required from either AI provider.
// Go validates its provenance and completeness; it does not assign labels,
// drift scores, or effort values.
type ScopeAssessmentV1 struct {
	SchemaVersion        string                `json:"schemaVersion"`
	RequestText          string                `json:"requestText"`
	Pairs                []ScopePairAssessment `json:"pairs"`
	Changes              []ScopeProposedChange `json:"changes"`
	MarginalDriftScore   *float64              `json:"marginalDriftScore"`
	CumulativeDriftScore *float64              `json:"cumulativeDriftScore"`
	ScoreExplanation     string                `json:"scoreExplanation"`
	RiskLevel            string                `json:"riskLevel"`
	Effort               ScopeEffortAssessment `json:"effort"`
	NeedsReview          bool                  `json:"needsReview"`
	ReviewReason         string                `json:"reviewReason,omitempty"`
}

type ScopePairAssessment struct {
	RequirementID string `bson:"requirementId" json:"requirementId"`
	Relation      string `bson:"relation" json:"relation"`
	OldQuote      string `bson:"oldQuote,omitempty" json:"oldQuote,omitempty"`
	NewQuote      string `bson:"newQuote,omitempty" json:"newQuote,omitempty"`
	Explanation   string `bson:"explanation" json:"explanation"`
}

type ScopeProposedChange struct {
	ChangeType    string   `json:"changeType"`
	Impact        string   `json:"impact"`
	RequirementID string   `json:"requirementId,omitempty"`
	Title         string   `json:"title"`
	ProposedText  string   `json:"proposedText"`
	EvidenceIDs   []string `json:"evidenceIds"`
	Explanation   string   `json:"explanation"`
}

type ScopeEffortAssessment struct {
	Status       string   `json:"status"`
	MinimumHours *float64 `json:"minimumHours,omitempty"`
	MaximumHours *float64 `json:"maximumHours,omitempty"`
	Assumptions  []string `json:"assumptions"`
	Questions    []string `json:"questions"`
}

var ErrIncompleteScopeAssessment = errors.New("AI scope assessment is incomplete or invalid")

func invalidScopeField(field string) error {
	return fmt.Errorf("%w: %s", ErrIncompleteScopeAssessment, field)
}

// ValidateScopeAssessment checks data integrity, not semantic correctness.
// In particular, every active requirement must have exactly one pair result.
func ValidateScopeAssessment(a ScopeAssessmentV1, request string, snapshot []requirement.RequirementSnapshot) error {
	if a.SchemaVersion != "scope-assessment-v1" || a.RequestText != request || len(a.Pairs) != len(snapshot) || len(a.ScoreExplanation) == 0 || !validImpact(a.RiskLevel) {
		return invalidScopeField("final schema, request, pair count, score explanation, or risk level")
	}
	if err := validateScopePairs(a.Pairs, request, snapshot); err != nil {
		return err
	}
	seen := make(map[string]bool, len(snapshot))
	relations := make(map[string]string, len(snapshot))
	for _, pair := range a.Pairs {
		seen[pair.RequirementID] = true
		relations[pair.RequirementID] = pair.Relation
	}
	for _, change := range a.Changes {
		if !validModelLabel(change.ChangeType) || change.ChangeType == "unchanged" {
			return invalidScopeField("change type")
		}
		if !validImpact(change.Impact) {
			return invalidScopeField("change impact")
		}
		if strings.TrimSpace(change.Title) == "" {
			return invalidScopeField("change title")
		}
		if strings.TrimSpace(change.Explanation) == "" {
			return invalidScopeField("change explanation")
		}
		if strings.TrimSpace(change.ProposedText) == "" {
			return invalidScopeField("change proposed text")
		}
		if change.ChangeType == "added" && change.RequirementID != "" || change.ChangeType != "added" && !seen[change.RequirementID] {
			return invalidScopeField("change target ID")
		}
		if change.ChangeType == "added" {
			// The model cannot claim whole-scope absence when any item in its
			// own complete ledger indicates coverage, overlap, or uncertainty.
			for _, relation := range relations {
				if relation != "unrelated" {
					return invalidScopeField("added change contradicts pair ledger")
				}
			}
		} else if change.ChangeType == "modified" && relations[change.RequirementID] != "modifies" && relations[change.RequirementID] != "contradicts" || change.ChangeType == "removed" && relations[change.RequirementID] != "removes" || change.ChangeType == "contradiction" && relations[change.RequirementID] != "contradicts" {
			return invalidScopeField("change type contradicts pair relation")
		}
		citesTarget := change.ChangeType == "added"
		for _, id := range change.EvidenceIDs {
			if !seen[id] {
				return invalidScopeField("unknown evidence ID")
			}
			if id == change.RequirementID {
				citesTarget = true
			}
		}
		if !citesTarget {
			return invalidScopeField("change evidence omits target ID")
		}
	}
	if !validScore(a.MarginalDriftScore) || !validScore(a.CumulativeDriftScore) {
		return invalidScopeField("missing or out-of-range drift score")
	}
	switch a.Effort.Status {
	case "not_estimable":
		if a.Effort.MinimumHours != nil || a.Effort.MaximumHours != nil || len(a.Effort.Questions) == 0 {
			return invalidScopeField("not-estimable effort fields")
		}
	case "estimated":
		if a.Effort.MinimumHours == nil || a.Effort.MaximumHours == nil || !finiteNonnegative(*a.Effort.MinimumHours) || !finiteNonnegative(*a.Effort.MaximumHours) || *a.Effort.MaximumHours < *a.Effort.MinimumHours || len(a.Effort.Assumptions) == 0 {
			return invalidScopeField("estimated effort fields")
		}
	default:
		return invalidScopeField("effort status")
	}
	if a.NeedsReview && strings.TrimSpace(a.ReviewReason) == "" {
		return invalidScopeField("review reason")
	}
	return nil
}
func validateScopePairs(pairs []ScopePairAssessment, request string, snapshot []requirement.RequirementSnapshot) error {
	if len(pairs) != len(snapshot) {
		return invalidScopeField("pair count")
	}
	items := make(map[string]string, len(snapshot))
	for _, item := range snapshot {
		if item.RequirementID == "" {
			return invalidScopeField("snapshot requirement ID")
		}
		items[item.RequirementID] = item.Title + " " + item.Description
	}
	seen := make(map[string]bool, len(snapshot))
	for _, pair := range pairs {
		old, ok := items[pair.RequirementID]
		if !ok || seen[pair.RequirementID] || !validPairRelation(pair.Relation) || strings.TrimSpace(pair.Explanation) == "" || len(pair.Explanation) > 300 {
			return invalidScopeField("pair ID, relation, or explanation")
		}
		seen[pair.RequirementID] = true
		if pair.OldQuote != "" && !strings.Contains(old, pair.OldQuote) || pair.NewQuote != "" && !strings.Contains(request, pair.NewQuote) {
			return invalidScopeField("pair quote is not in scope or request")
		}
	}
	return nil
}
func validPairRelation(value string) bool {
	switch value {
	case "covered", "unrelated", "modifies", "removes", "contradicts", "unclear":
		return true
	}
	return false
}
func validImpact(value string) bool {
	switch value {
	case "low", "medium", "high", "critical":
		return true
	}
	return false
}

func validScore(value *float64) bool {
	return value != nil && !math.IsNaN(*value) && !math.IsInf(*value, 0) && *value >= 0 && *value <= 100
}

func finiteNonnegative(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0) && value >= 0
}
