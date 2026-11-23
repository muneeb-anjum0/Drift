package requirement

import (
	"errors"
	"testing"
)

func TestApprovedScopeRollsForwardWithoutChangingOriginal(t *testing.T) {
	original := make([]RequirementSnapshot, 20)
	for i := range original {
		original[i] = RequirementSnapshot{RequirementID: string(rune('a' + i)), Title: "Original", Description: "Agreed behavior"}
	}
	first, err := projectScope(original, []approvedScopeChange{{Title: "Delivery slots", ProposedText: "Customer chooses a delivery slot", ChangeType: "added"}})
	if err != nil {
		t.Fatal(err)
	}
	if len(first) != 21 || len(original) != 20 || first[20].RequirementID == "" {
		t.Fatal("first accepted change did not create a 21-item scope")
	}
	second, err := projectScope(first, []approvedScopeChange{{Title: "Delivery slots", ProposedText: "Customer chooses or changes a delivery slot", ChangeType: "modified", BaselineRequirementID: first[20].RequirementID}})
	if err != nil {
		t.Fatal(err)
	}
	if len(second) != 21 || second[20].RequirementID != first[20].RequirementID || second[20].Description == first[20].Description {
		t.Fatal("accepted addition was not available for the next comparison")
	}
	if original[0].Description != "Agreed behavior" {
		t.Fatal("original agreement was mutated")
	}
}

func TestApprovedScopeRejectsUnanchoredChanges(t *testing.T) {
	base := []RequirementSnapshot{{RequirementID: "a", Title: "Orders", Description: "Orders are visible"}}
	for _, change := range []approvedScopeChange{
		{Title: "Wrong", ProposedText: "New text", ChangeType: "modified"},
		{Title: "Wrong", ProposedText: "New text", ChangeType: "removed", BaselineRequirementID: "missing"},
		{Title: "Wrong", ProposedText: "New text", ChangeType: "added", BaselineRequirementID: "a"},
		{Title: "Wrong", ProposedText: "New text", ChangeType: "ambiguous"},
	} {
		if _, err := projectScope(base, []approvedScopeChange{change}); !errors.Is(err, ErrScopeChangeInvalid) {
			t.Fatalf("accepted invalid change: %+v", change)
		}
	}
}
