package drift

import (
	"strings"
	"testing"
)

func TestLabelOnlyPresentationHasNoInventedModelFields(t *testing.T) {
	prediction := ModelPrediction{Label: "removed", LabelOnly: true}
	changes := predictionToChanges(prediction, "Remove weekly CSV exports")
	if len(changes) != 1 {
		t.Fatalf("expected one proposed change, got %d", len(changes))
	}
	change := changes[0]
	if change.ChangeType != "removed" || change.Confidence != 0 || change.NewText != "Remove weekly CSV exports" {
		t.Fatalf("label-only presentation invented or lost model data: %#v", change)
	}
	if strings.Contains(strings.ToLower(change.Description), "because") {
		t.Fatalf("generic presentation claims unsupported reasoning: %q", change.Description)
	}
	score, _, _, _, _ := Score(changes)
	if score == 0 {
		t.Fatal("a label-only change was silently dropped")
	}
}
