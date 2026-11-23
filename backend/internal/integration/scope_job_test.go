package integration_test

import (
	"context"
	"testing"
	"time"

	"driftledger/backend/internal/modules/drift"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestScopeJobPersistsProgressAndReturnsBoundPreview(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	baseline := primitive.NewObjectID()
	if _, err := f.db.Collection("requirementversions").InsertOne(ctx, bson.M{"_id": baseline, "project": f.projectA, "workspace": f.workspaceA, "versionNumber": 1, "requirementsSnapshot": []any{bson.M{"requirementId": "report-1", "title": "Monthly report export", "description": "PDF reports"}}}); err != nil {
		t.Fatal(err)
	}
	provider := &fixtureAnalysisProvider{name: "local"}
	service := drift.NewService(f.db, provider)
	job, err := service.StartScopeJob(ctx, f.ownerA, drift.AnalyzeRequest{ProjectID: f.projectA.Hex(), BaselineVersionID: baseline.Hex(), InputText: "Change monthly reports export to CSV."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.GetScopeJob(ctx, f.ownerB, job.ID); err == nil {
		t.Fatal("other tenant read the analysis job")
	}
	workerCtx, cancel := context.WithCancel(ctx)
	finished := make(chan struct{})
	go func() { service.RunScopeJobs(workerCtx); close(finished) }()
	defer func() { cancel(); <-finished }()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		current, err := service.GetScopeJob(ctx, f.ownerA, job.ID)
		if err != nil {
			t.Fatal(err)
		}
		if current.Status == "failed" {
			t.Fatalf("job failed: %s", current.Error)
		}
		if current.Status == "complete" {
			if current.Processed != 1 || current.Result == nil || len(current.Result.PreviewID) != 64 || len(current.Result.ScopePairs) != 1 {
				t.Fatalf("incomplete job result: %+v", current)
			}
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("scope job did not finish")
}

func TestQueuedScopeJobStopsAfterProviderConfigurationChanges(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	baseline := primitive.NewObjectID()
	if _, err := f.db.Collection("requirementversions").InsertOne(ctx, bson.M{"_id": baseline, "project": f.projectA, "workspace": f.workspaceA, "versionNumber": 1, "requirementsSnapshot": []any{bson.M{"requirementId": "report-1", "title": "Reports", "description": "Monthly reports"}}}); err != nil {
		t.Fatal(err)
	}
	service := drift.NewService(f.db, &fixtureAnalysisProvider{name: "local"})
	job, err := service.StartScopeJob(ctx, f.ownerA, drift.AnalyzeRequest{ProjectID: f.projectA.Hex(), BaselineVersionID: baseline.Hex(), InputText: "Add CSV export."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Collection("workspaceproviderconfigs").InsertOne(ctx, bson.M{"_id": f.workspaceA, "updatedAt": time.Now().UTC()}); err != nil {
		t.Fatal(err)
	}
	workerCtx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() { service.RunScopeJobs(workerCtx); close(done) }()
	defer func() { cancel(); <-done }()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		current, err := service.GetScopeJob(ctx, f.ownerA, job.ID)
		if err != nil {
			t.Fatal(err)
		}
		if current.Status == "failed" {
			count, err := f.db.Collection("analysispreviews").CountDocuments(ctx, bson.M{"user": f.ownerA})
			if err != nil || count != 0 {
				t.Fatalf("provider switch left a preview: count=%d err=%v", count, err)
			}
			return
		}
		if current.Status == "complete" {
			t.Fatal("job used a changed provider configuration")
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("job did not reject changed provider configuration")
}

func TestCanceledQueuedScopeJobIsNotRun(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	baseline := primitive.NewObjectID()
	if _, err := f.db.Collection("requirementversions").InsertOne(ctx, bson.M{"_id": baseline, "project": f.projectA, "workspace": f.workspaceA, "versionNumber": 1, "requirementsSnapshot": []any{bson.M{"requirementId": "report-1", "title": "Reports", "description": "Monthly reports"}}}); err != nil {
		t.Fatal(err)
	}
	service := drift.NewService(f.db, &fixtureAnalysisProvider{name: "local"})
	job, err := service.StartScopeJob(ctx, f.ownerA, drift.AnalyzeRequest{ProjectID: f.projectA.Hex(), BaselineVersionID: baseline.Hex(), InputText: "Add CSV export."})
	if err != nil {
		t.Fatal(err)
	}
	if err := service.CancelScopeJob(ctx, f.ownerA, job.ID); err != nil {
		t.Fatal(err)
	}
	workerCtx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() { service.RunScopeJobs(workerCtx); close(done) }()
	time.Sleep(100 * time.Millisecond)
	cancel()
	<-done
	current, err := service.GetScopeJob(ctx, f.ownerA, job.ID)
	if err != nil || current.Status != "canceled" || current.Result != nil {
		t.Fatalf("canceled job ran: job=%+v err=%v", current, err)
	}
}
