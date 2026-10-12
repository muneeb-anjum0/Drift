package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"driftledger/server-go/internal/config"
	change_request "driftledger/server-go/internal/modules/change_request"
	"driftledger/server-go/internal/modules/drift"
	"driftledger/server-go/internal/router"
	storageSvc "driftledger/server-go/internal/storage"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type fixtureAnalysisProvider struct {
	name   string
	secret string
	calls  int
}

func (*fixtureAnalysisProvider) Enabled() bool                { return true }
func (*fixtureAnalysisProvider) Health(context.Context) error { return nil }
func (*fixtureAnalysisProvider) RelevanceThreshold() float64  { return 0.1 }
func (*fixtureAnalysisProvider) MaxAnalyzedRequirements() int { return 1 }
func (p *fixtureAnalysisProvider) ProviderName() string       { return p.name }
func (*fixtureAnalysisProvider) ModelName() string            { return "fixture-model" }
func (p *fixtureAnalysisProvider) Predict(context.Context, drift.ModelAnalyzeRequest) (drift.ModelPrediction, error) {
	p.calls++
	return drift.ModelPrediction{Label: "modified", Confidence: 0.91, Reasoning: "The requested export format changes.", ChangedElements: []string{"CSV export"}}, nil
}

func TestAnalysisPreviewSaveTrustBoundary(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	baseline := primitive.NewObjectID()
	newBaseline := primitive.NewObjectID()
	if _, err := f.db.Collection("requirementversions").InsertOne(ctx, bson.M{"_id": baseline, "project": f.projectA, "workspace": f.workspaceA, "versionNumber": 1,
		"requirementsSnapshot": []any{bson.M{"requirementId": "report-1", "title": "Monthly report export", "description": "Admins can export monthly reports as PDF."}}}); err != nil {
		t.Fatal(err)
	}
	external := &fixtureAnalysisProvider{name: "openai_compatible", secret: "synthetic-provider-credential"}
	service := drift.NewService(f.db, external)
	input := "Change monthly reports export from PDF to CSV."
	preview, err := service.Analyze(ctx, f.ownerA, drift.AnalyzeRequest{ProjectID: f.projectA.Hex(), BaselineVersionID: baseline.Hex(), InputText: input})
	if err != nil || len(preview.PreviewID) != 64 || external.calls != 1 {
		t.Fatalf("authoritative external preview failed: %#v calls=%d err=%v", preview, external.calls, err)
	}
	// An immutable later snapshot must not retarget an earlier analysis.
	if _, err := f.db.Collection("requirementversions").InsertOne(ctx, bson.M{"_id": newBaseline, "project": f.projectA, "workspace": f.workspaceA, "versionNumber": 2,
		"requirementsSnapshot": []any{bson.M{"requirementId": "report-2", "title": "Weekly report export", "description": "Admins can export weekly reports as CSV."}}}); err != nil {
		t.Fatal(err)
	}
	var stored bson.M
	if err := f.db.Collection("analysispreviews").FindOne(ctx, bson.M{"_id": preview.PreviewID}).Decode(&stored); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(fmt.Sprint(stored), "synthetic-provider-credential") || stored["providerType"] != "openai_compatible" {
		t.Fatal("preview persistence leaked a credential or lost provider provenance")
	}
	// Saving uses the analyzed provider even if workspace selection changes.
	if _, err := f.db.Collection("workspaceproviderconfigs").InsertOne(ctx, bson.M{
		"_id": f.workspaceA, "workspace": f.workspaceA, "providerType": "local",
	}); err != nil {
		t.Fatal(err)
	}
	service = drift.NewService(f.db, &fixtureAnalysisProvider{name: "local"})
	cfg := config.Config{AppEnv: "test", JWTSecret: testJWTSecret, JWTExpiresInHours: 1,
		AuthRateLimitRequests: 100, InferenceRateLimitRequests: 100,
		RateLimitWindow: time.Minute, MaxUploadSizeMB: 1}
	app := router.New(f.db, cfg, storageSvc.Service{})
	owner := token(t, f.ownerA, "owner-a@example.test")
	other := token(t, f.ownerB, "owner-b@example.test")
	sameWorkspaceOther := token(t, f.viewerA, "viewer-a@example.test")
	previewBody := bson.M{"previewId": preview.PreviewID}
	for _, tc := range []struct {
		name   string
		body   bson.M
		bearer string
		want   int
	}{
		{"fabricated result without preview", bson.M{"projectId": f.projectA.Hex(), "detectedChanges": []any{bson.M{"changeType": "removed"}}}, owner, http.StatusBadRequest},
		{"change label", bson.M{"previewId": preview.PreviewID, "detectedChanges": []any{bson.M{"changeType": "removed"}}}, owner, http.StatusBadRequest},
		{"engine spoof", bson.M{"previewId": preview.PreviewID, "analysisEngine": "qwen_lora"}, owner, http.StatusBadRequest},
		{"input substitution", bson.M{"previewId": preview.PreviewID, "inputText": "Remove authentication"}, owner, http.StatusBadRequest},
		{"project substitution", bson.M{"previewId": preview.PreviewID, "projectId": f.projectB.Hex()}, owner, http.StatusBadRequest},
		{"workspace substitution", bson.M{"previewId": preview.PreviewID, "workspaceId": f.workspaceB.Hex()}, owner, http.StatusBadRequest},
		{"baseline substitution", bson.M{"previewId": preview.PreviewID, "baselineVersionId": newBaseline.Hex()}, owner, http.StatusBadRequest},
		{"cross-tenant user", previewBody, other, http.StatusNotFound},
		{"same-workspace other user", previewBody, sameWorkspaceOther, http.StatusNotFound},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := request(app, http.MethodPost, "/api/v1/drift/save", tc.bearer, tc.body)
			if got.Code != tc.want {
				t.Fatalf("got %d, want %d: %s", got.Code, tc.want, got.Body.String())
			}
		})
	}
	if _, err := f.db.Collection("workspacemembers").UpdateOne(ctx, bson.M{"workspace": f.workspaceA, "user": f.ownerA}, bson.M{"$set": bson.M{"role": "viewer"}}); err != nil {
		t.Fatal(err)
	}
	if got := request(app, http.MethodPost, "/api/v1/drift/save", owner, previewBody); got.Code != http.StatusForbidden {
		t.Fatalf("revoked writer saved preview: %d %s", got.Code, got.Body.String())
	}
	if _, err := f.db.Collection("workspacemembers").UpdateOne(ctx, bson.M{"workspace": f.workspaceA, "user": f.ownerA}, bson.M{"$set": bson.M{"role": "owner"}}); err != nil {
		t.Fatal(err)
	}
	got := request(app, http.MethodPost, "/api/v1/drift/save", owner, previewBody)
	if got.Code != http.StatusCreated {
		t.Fatalf("authoritative save failed: %d %s", got.Code, got.Body.String())
	}
	var response struct {
		Data struct {
			Analysis drift.DriftAnalysis `json:"analysis"`
		} `json:"data"`
	}
	if err := json.Unmarshal(got.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	a := response.Data.Analysis
	savedChanges, _ := json.Marshal(a.DetectedChanges)
	previewChanges, _ := json.Marshal(preview.DetectedChanges)
	savedResults, _ := json.Marshal(a.RequirementResults)
	previewResults, _ := json.Marshal(preview.RequirementResults)
	if a.AnalysisEngine != "openai_compatible" || a.ProvenanceVersion != "server_bound_v1" ||
		a.Project != f.projectA || a.Workspace != f.workspaceA || a.BaselineVersion != baseline ||
		a.BaselineVersionNumber != 1 || a.InputText != input || a.InputType != preview.InputType ||
		a.Summary != preview.Summary || a.DriftScore != preview.DriftScore || a.RiskLevel != preview.RiskLevel ||
		a.EstimatedExtraHours != preview.EstimatedExtraHours || a.ModifiedCount != preview.ModifiedCount ||
		!bytes.Equal(savedChanges, previewChanges) || !bytes.Equal(savedResults, previewResults) {
		t.Fatalf("stored analysis diverged from preview: %#v", a)
	}
	if got := request(app, http.MethodPost, "/api/v1/drift/save", owner, previewBody); got.Code != http.StatusNotFound {
		t.Fatalf("consumed preview replayed: %d %s", got.Code, got.Body.String())
	}
	count, err := f.db.Collection("driftanalyses").CountDocuments(ctx, bson.M{})
	if err != nil || count != 1 {
		t.Fatalf("replay/fabrication persisted data: %d %v", count, err)
	}
	changeService := change_request.NewService(f.db)
	draft, err := changeService.Generate(ctx, f.ownerA, change_request.GenerateRequest{DriftAnalysisID: a.ID.Hex()})
	if err != nil || draft.GeneratedBy != a.AnalysisEngine {
		t.Fatalf("change request did not use persisted analysis: %#v %v", draft, err)
	}
	draft.GeneratedBy = "fabricated-provider"
	change, err := changeService.Save(ctx, f.ownerA, draft)
	if err != nil || change.GeneratedBy != a.AnalysisEngine {
		t.Fatalf("draft changed provider provenance: %#v %v", change, err)
	}
	if external.calls != 1 {
		t.Fatal("save unexpectedly reran external inference")
	}
}

func TestExpiredAndCorruptAnalysisPreviews(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	baseline := primitive.NewObjectID()
	if _, err := f.db.Collection("requirementversions").InsertOne(ctx, bson.M{
		"_id": baseline, "project": f.projectA, "workspace": f.workspaceA, "versionNumber": 1,
		"requirementsSnapshot": []any{bson.M{"requirementId": "report-1", "title": "Monthly reports", "description": "Admins export monthly reports as PDF."}},
	}); err != nil {
		t.Fatal(err)
	}
	service := drift.NewService(f.db, &fixtureAnalysisProvider{name: "local"})
	preview, err := service.Analyze(ctx, f.ownerA, drift.AnalyzeRequest{ProjectID: f.projectA.Hex(), BaselineVersionID: baseline.Hex(), InputText: "Change monthly reports export to CSV."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Collection("analysispreviews").UpdateByID(ctx, preview.PreviewID, bson.M{"$set": bson.M{"expiresAt": time.Now().Add(-time.Minute)}}); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Save(ctx, f.ownerA, drift.SaveRequest{PreviewID: preview.PreviewID}); err != drift.ErrPreviewExpired && err != drift.ErrPreviewUnavailable {
		t.Fatalf("expired preview saved: %v", err)
	}
	if count, err := f.db.Collection("driftanalyses").CountDocuments(ctx, bson.M{}); err != nil || count != 0 {
		t.Fatal("expired preview persisted an analysis")
	}
	preview, err = service.Analyze(ctx, f.ownerA, drift.AnalyzeRequest{ProjectID: f.projectA.Hex(), BaselineVersionID: baseline.Hex(), InputText: "Change monthly reports export to CSV."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Collection("analysispreviews").UpdateByID(ctx, preview.PreviewID, bson.M{"$set": bson.M{"inputSha256": "wrong"}}); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Save(ctx, f.ownerA, drift.SaveRequest{PreviewID: preview.PreviewID}); err != drift.ErrPreviewCorrupt {
		t.Fatalf("corrupt preview saved: %v", err)
	}
	preview, err = service.Analyze(ctx, f.ownerA, drift.AnalyzeRequest{ProjectID: f.projectA.Hex(), BaselineVersionID: baseline.Hex(), InputText: "Change monthly reports export to CSV."})
	if err != nil {
		t.Fatal(err)
	}
	localAnalysis, err := service.Save(ctx, f.ownerA, drift.SaveRequest{PreviewID: preview.PreviewID})
	if err != nil || localAnalysis.AnalysisEngine != "qwen_lora" || localAnalysis.ProvenanceVersion != "server_bound_v1" {
		t.Fatalf("local fixture did not save its own provenance: %#v %v", localAnalysis, err)
	}
}
