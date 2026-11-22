package drift

import (
	"context"
	"testing"

	"driftledger/backend/internal/modules/requirement"
)

type scopeReviewProvider struct {
	label  string
	labels map[string]string
	calls  int
}

func (*scopeReviewProvider) Enabled() bool                { return true }
func (*scopeReviewProvider) Health(context.Context) error { return nil }
func (*scopeReviewProvider) RelevanceThreshold() float64  { return 0.25 }
func (*scopeReviewProvider) MaxAnalyzedRequirements() int { return 3 }
func (*scopeReviewProvider) ProviderName() string         { return "local" }
func (*scopeReviewProvider) ModelName() string            { return "test" }
func (p *scopeReviewProvider) Predict(_ context.Context, request ModelAnalyzeRequest) (ModelPrediction, error) {
	p.calls++
	label := p.label
	if selected, ok := p.labels[request.BaselineRequirement]; ok {
		label = selected
	}
	return ModelPrediction{Label: label, Confidence: 0.95, Reasoning: "pairwise result", ChangedElements: []string{"delivery option"}}, nil
}

func TestFourthRequirementCanAnchorModification(t *testing.T) {
	provider := &scopeReviewProvider{label: "added", labels: map[string]string{
		"Delivery schedule: Customers choose a delivery day.": "modified",
	}}
	snapshot := []requirement.RequirementSnapshot{
		{RequirementID: "login", Title: "Login", Description: "Customers sign in."},
		{RequirementID: "reports", Title: "Reports", Description: "Managers export reports."},
		{RequirementID: "orders", Title: "Orders", Description: "Customers view orders."},
		{RequirementID: "delivery", Title: "Delivery schedule", Description: "Customers choose a delivery day."},
	}
	changes, _, results, called, err := (Service{}).analyzeRequirements(context.Background(), provider, snapshot, "Customers should choose a delivery day and time slot.")
	if err != nil || !called || provider.calls != len(snapshot) || len(results) != len(snapshot) {
		t.Fatalf("expected every requirement checked: calls=%d results=%d err=%v", provider.calls, len(results), err)
	}
	if len(changes) != 1 || changes[0].ChangeType != "modified" || changes[0].BaselineRequirementID != "delivery" {
		t.Fatalf("later baseline was not used: %#v", changes)
	}
}

func TestExistingScopeProducesNoAddedRequirement(t *testing.T) {
	provider := &scopeReviewProvider{label: "unchanged"}
	snapshot := []requirement.RequirementSnapshot{{RequirementID: "invoice", Title: "Invoice PDF download", Description: "Clients download an invoice PDF after issuance."}}
	changes, _, results, called, err := (Service{}).analyzeRequirements(context.Background(), provider, snapshot, "Clients should download an invoice PDF after issuance.")
	if err != nil || !called || provider.calls != 1 || len(results) != 1 {
		t.Fatalf("expected complete comparison: calls=%d results=%d err=%v", provider.calls, len(results), err)
	}
	if len(changes) != 0 {
		t.Fatalf("covered capability was proposed as a change: %#v", changes)
	}
}

func TestUnrelatedUnchangedDoesNotHideNewRequest(t *testing.T) {
	provider := &scopeReviewProvider{label: "added", labels: map[string]string{
		"Password reset: Users reset passwords by email.": "unchanged",
	}}
	snapshot := []requirement.RequirementSnapshot{
		{RequirementID: "login", Title: "Password reset", Description: "Users reset passwords by email."},
		{RequirementID: "reports", Title: "Reports", Description: "Managers export reports."},
	}
	changes, _, _, _, err := (Service{}).analyzeRequirements(context.Background(), provider, snapshot, "Schedule deliveries in time slots")
	if err != nil || provider.calls != 2 || len(changes) != 1 || changes[0].ChangeType != "added" {
		t.Fatalf("unrelated unchanged blocked addition: calls=%d changes=%#v err=%v", provider.calls, changes, err)
	}
}

func TestSeparateRequestsProduceSeparateProposedAdditions(t *testing.T) {
	provider := &scopeReviewProvider{label: "added"}
	snapshot := []requirement.RequirementSnapshot{{RequirementID: "login", Title: "Password reset", Description: "Users reset passwords by email."}}
	changes, _, results, _, err := (Service{}).analyzeRequirements(context.Background(), provider, snapshot, "Add delivery time slots. Add a gift message at checkout.")
	if err != nil || provider.calls != 2 || len(results) != 2 || len(changes) != 2 {
		t.Fatalf("requests were merged or skipped: calls=%d results=%d changes=%#v err=%v", provider.calls, len(results), changes, err)
	}
	if changes[0].NewText == changes[1].NewText || results[0].RequestText == results[1].RequestText {
		t.Fatalf("request-level provenance was lost: changes=%#v results=%#v", changes, results)
	}
}

func TestWholeSnapshotCanProposeOneAddition(t *testing.T) {
	provider := &scopeReviewProvider{label: "added"}
	message := "Customers should choose a delivery date and time slot at checkout."
	snapshot := []requirement.RequirementSnapshot{
		{RequirementID: "order-detail", Title: "Order detail view", Description: "Customers see order items and delivery address."},
		{RequirementID: "order-summary", Title: "Order summary dashboard", Description: "Customers see recent orders and delivery status."},
	}
	changes, _, _, called, err := (Service{}).analyzeRequirements(context.Background(), provider, snapshot, message)
	if err != nil || !called || provider.calls < 2 {
		t.Fatalf("expected pairwise predictions, calls=%d called=%t err=%v", provider.calls, called, err)
	}
	if len(changes) != 1 || changes[0].ReviewRequired || changes[0].ChangeType != "added" {
		t.Fatalf("expected one proposed addition, got %#v", changes)
	}
	if changes[0].BaselineRequirementID != "" || changes[0].OldText != "" || changes[0].Confidence != 0 {
		t.Fatalf("addition claims unsupported provenance or confidence: %#v", changes[0])
	}
}

func TestInvoiceAlreadyInSnapshotIsNotPromotedFromPairwiseAddedLabels(t *testing.T) {
	provider := &scopeReviewProvider{label: "added"}
	snapshot := []requirement.RequirementSnapshot{
		{RequirementID: "invoice", Title: "Invoice PDF download", Description: "Clients can download an invoice PDF for an order after the invoice is issued."},
		{RequirementID: "attachment", Title: "Support request attachment", Description: "Clients can attach up to three PDF files to a support request."},
	}
	changes, _, _, called, err := (Service{}).analyzeRequirements(context.Background(), provider, snapshot, "We also need customers to download their invoices as PDF files from the portal.")
	if err != nil || !called {
		t.Fatalf("expected pairwise check, called=%t err=%v", called, err)
	}
	if len(changes) != 1 || !changes[0].ReviewRequired || changes[0].ChangeType != "ambiguous" || changes[0].BaselineRequirementID != "" {
		t.Fatalf("existing invoice capability was falsely promoted as new: %#v", changes)
	}
}

func TestRetrievalMissStillChecksEntireSnapshot(t *testing.T) {
	provider := &scopeReviewProvider{label: "added"}
	snapshot := []requirement.RequirementSnapshot{{RequirementID: "login", Title: "Password reset", Description: "Users reset passwords by email."}}
	changes, _, _, called, err := (Service{}).analyzeRequirements(context.Background(), provider, snapshot, "Schedule deliveries in time slots")
	if err != nil || !called || provider.calls != 1 {
		t.Fatalf("expected full snapshot call, calls=%d called=%t err=%v", provider.calls, called, err)
	}
	if len(changes) != 1 || changes[0].ReviewRequired || changes[0].ChangeType != "added" || changes[0].Confidence != 0 {
		t.Fatalf("retrieval miss failed to propose addition: %#v", changes)
	}
}

func TestSpecificModificationKeepsItsBaseline(t *testing.T) {
	provider := &scopeReviewProvider{label: "modified"}
	snapshot := []requirement.RequirementSnapshot{{RequirementID: "window", Title: "Cancellation window", Description: "Customers can cancel appointments up to 24 hours before start."}}
	changes, _, _, called, err := (Service{}).analyzeRequirements(context.Background(), provider, snapshot, "Customers can cancel appointments up to 2 hours before start.")
	if err != nil || !called || provider.calls != 1 {
		t.Fatalf("expected one model call, calls=%d called=%t err=%v", provider.calls, called, err)
	}
	if len(changes) != 1 || changes[0].ReviewRequired || changes[0].ChangeType != "modified" || changes[0].BaselineRequirementID != "window" {
		t.Fatalf("specific change lost its baseline: %#v", changes)
	}
}

func TestReviewPromptDoesNotInflateDriftScoreOrEffort(t *testing.T) {
	review := scopeReviewChange("Schedule delivery", "Cannot establish novelty")
	score, risk, counts, hours, summary := scoreWithScopeReview([]DetectedChange{review})
	if score != 0 || risk != "low" || hours != 0 || counts["added"] != 0 || counts["ambiguous"] != 1 || summary == "" {
		t.Fatalf("review was scored as a confirmed change: score=%d risk=%s counts=%#v hours=%v summary=%q", score, risk, counts, hours, summary)
	}
}
