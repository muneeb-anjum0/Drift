package change_request

import (
	"testing"

	"driftledger/backend/internal/modules/drift"
)

func TestAnalysisNeedsScopeReview(t *testing.T) {
	analysis := drift.DriftAnalysis{DetectedChanges: []drift.DetectedChange{
		{ChangeType: "modified"},
		{ChangeType: "ambiguous", ReviewRequired: true},
	}}
	if !analysisNeedsScopeReview(analysis) {
		t.Fatal("mixed analysis with unresolved scope review was allowed")
	}
	analysis.DetectedChanges[1].ReviewRequired = false
	if analysisNeedsScopeReview(analysis) {
		t.Fatal("resolved analysis was blocked")
	}
}
