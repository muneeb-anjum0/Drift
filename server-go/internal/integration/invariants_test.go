package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"sort"
	"sync"
	"testing"
	"time"

	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/lifecycle"
	change_request "driftledger/server-go/internal/modules/change_request"
	"driftledger/server-go/internal/modules/requirement"
	"driftledger/server-go/internal/router"
	storageSvc "driftledger/server-go/internal/storage"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const testJWTSecret = "integration-jwt-secret-with-at-least-32-characters"

type fixture struct {
	db                 *mongo.Database
	client             *mongo.Client
	ownerA, viewerA    primitive.ObjectID
	ownerB             primitive.ObjectID
	workspaceA         primitive.ObjectID
	workspaceB         primitive.ObjectID
	projectA, projectB primitive.ObjectID
}

type failingDeleteStorage struct{}

func (failingDeleteStorage) Enabled() bool { return true }
func (failingDeleteStorage) UploadFile(context.Context, string, string, *multipart.FileHeader) (string, string, string, string, error) {
	return "", "", "", "", errors.New("unexpected upload")
}
func (failingDeleteStorage) DeleteFile(context.Context, string) error {
	return errors.New("injected storage deletion failure")
}

func newFixture(t *testing.T) fixture {
	t.Helper()
	uri := os.Getenv("MONGO_TEST_URI")
	if uri == "" {
		t.Skip("set MONGO_TEST_URI to run Mongo-backed integration tests")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Fatalf("connect to MongoDB: %v", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		t.Fatalf("ping MongoDB: %v", err)
	}
	db := client.Database("drift_integration_" + primitive.NewObjectID().Hex())
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		_ = db.Drop(cleanupCtx)
		_ = client.Disconnect(cleanupCtx)
	})
	_, err = db.Collection("requirementversions").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "project", Value: 1}, {Key: "versionNumber", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		t.Fatalf("create baseline uniqueness index: %v", err)
	}

	f := fixture{
		db: db, client: client,
		ownerA: primitive.NewObjectID(), viewerA: primitive.NewObjectID(), ownerB: primitive.NewObjectID(),
		workspaceA: primitive.NewObjectID(), workspaceB: primitive.NewObjectID(),
		projectA: primitive.NewObjectID(), projectB: primitive.NewObjectID(),
	}
	now := time.Now().UTC()
	users := []any{
		bson.M{"_id": f.ownerA, "name": "Owner A", "email": "owner-a@example.test"},
		bson.M{"_id": f.viewerA, "name": "Viewer A", "email": "viewer-a@example.test"},
		bson.M{"_id": f.ownerB, "name": "Owner B", "email": "owner-b@example.test"},
	}
	workspaces := []any{
		bson.M{"_id": f.workspaceA, "name": "Tenant A", "slug": "tenant-a", "owner": f.ownerA, "createdAt": now, "updatedAt": now},
		bson.M{"_id": f.workspaceB, "name": "Tenant B", "slug": "tenant-b", "owner": f.ownerB, "createdAt": now, "updatedAt": now},
	}
	members := []any{
		bson.M{"_id": primitive.NewObjectID(), "workspace": f.workspaceA, "user": f.ownerA, "role": "owner"},
		bson.M{"_id": primitive.NewObjectID(), "workspace": f.workspaceA, "user": f.viewerA, "role": "viewer"},
		bson.M{"_id": primitive.NewObjectID(), "workspace": f.workspaceB, "user": f.ownerB, "role": "owner"},
	}
	projects := []any{
		bson.M{"_id": f.projectA, "workspace": f.workspaceA, "name": "Project A", "clientName": "Client A", "createdBy": f.ownerA, "createdAt": now, "updatedAt": now},
		bson.M{"_id": f.projectB, "workspace": f.workspaceB, "name": "Project B", "clientName": "Client B", "createdBy": f.ownerB, "createdAt": now, "updatedAt": now},
	}
	for collection, documents := range map[string][]any{
		"users": users, "workspaces": workspaces, "workspacemembers": members, "projects": projects,
	} {
		if _, err := db.Collection(collection).InsertMany(ctx, documents); err != nil {
			t.Fatalf("seed %s: %v", collection, err)
		}
	}
	return f
}

func token(t *testing.T, userID primitive.ObjectID, email string) string {
	t.Helper()
	value, err := utils.SignJWT(userID, email, testJWTSecret, 1)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return value
}

func request(app http.Handler, method, path, bearer string, payload any) *httptest.ResponseRecorder {
	var body bytes.Buffer
	if payload != nil {
		_ = json.NewEncoder(&body).Encode(payload)
	}
	req := httptest.NewRequest(method, path, &body)
	req.Header.Set("Content-Type", "application/json")
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	recorder := httptest.NewRecorder()
	app.ServeHTTP(recorder, req)
	return recorder
}

func TestAuthenticationAuthorizationAndTenantIsolation(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	requirementID := primitive.NewObjectID()
	driftID := primitive.NewObjectID()
	changeRequestID := primitive.NewObjectID()
	fileID := primitive.NewObjectID()
	seed := map[string]any{
		"requirements":   bson.M{"_id": requirementID, "project": f.projectA, "workspace": f.workspaceA, "title": "Protected requirement"},
		"driftanalyses":  bson.M{"_id": driftID, "project": f.projectA, "workspace": f.workspaceA},
		"changerequests": bson.M{"_id": changeRequestID, "project": f.projectA, "workspace": f.workspaceA, "approvalStatus": change_request.ApprovalPending},
		"files":          bson.M{"_id": fileID, "project": f.projectA, "workspace": f.workspaceA, "storagePath": "test/path"},
	}
	for collection, document := range seed {
		if _, err := f.db.Collection(collection).InsertOne(ctx, document); err != nil {
			t.Fatalf("seed %s: %v", collection, err)
		}
	}
	cfg := config.Config{
		AppEnv: "test", JWTSecret: testJWTSecret, JWTExpiresInHours: 1,
		AuthRateLimitRequests: 100, InferenceRateLimitRequests: 100,
		RateLimitWindow: time.Minute, MaxUploadSizeMB: 1,
	}
	app := router.New(f.db, cfg, storageSvc.Service{})
	ownerAToken := token(t, f.ownerA, "owner-a@example.test")
	viewerToken := token(t, f.viewerA, "viewer-a@example.test")
	ownerBToken := token(t, f.ownerB, "owner-b@example.test")
	deletedUserToken := token(t, primitive.NewObjectID(), "deleted@example.test")

	tests := []struct {
		name, method, path, bearer string
		payload                    any
		want                       int
	}{
		{"missing token", http.MethodGet, "/api/v1/projects", "", nil, http.StatusUnauthorized},
		{"malformed token", http.MethodGet, "/api/v1/projects", "not-a-jwt", nil, http.StatusUnauthorized},
		{"nonexistent user", http.MethodGet, "/api/v1/projects", deletedUserToken, nil, http.StatusUnauthorized},
		{"unauthenticated inference", http.MethodPost, "/api/v1/drift/analyze", "", bson.M{}, http.StatusUnauthorized},
		{"viewer can read workspace", http.MethodGet, "/api/v1/workspaces/" + f.workspaceA.Hex(), viewerToken, nil, http.StatusOK},
		{"viewer cannot update workspace", http.MethodPatch, "/api/v1/workspaces/" + f.workspaceA.Hex(), viewerToken, bson.M{"name": "Forbidden"}, http.StatusForbidden},
		{"viewer cannot delete workspace", http.MethodDelete, "/api/v1/workspaces/" + f.workspaceA.Hex(), viewerToken, nil, http.StatusForbidden},
		{"cross-tenant workspace read denied", http.MethodGet, "/api/v1/workspaces/" + f.workspaceB.Hex(), ownerAToken, nil, http.StatusForbidden},
		{"viewer can read own tenant", http.MethodGet, "/api/v1/projects/" + f.projectA.Hex(), viewerToken, nil, http.StatusOK},
		{"viewer cannot create", http.MethodPost, "/api/v1/projects", viewerToken, bson.M{"workspaceId": f.workspaceA.Hex(), "name": "Forbidden"}, http.StatusForbidden},
		{"viewer cannot update", http.MethodPatch, "/api/v1/projects/" + f.projectA.Hex(), viewerToken, bson.M{"name": "Forbidden"}, http.StatusForbidden},
		{"viewer cannot delete", http.MethodDelete, "/api/v1/projects/" + f.projectA.Hex(), viewerToken, nil, http.StatusForbidden},
		{"cross-tenant get denied", http.MethodGet, "/api/v1/projects/" + f.projectB.Hex(), ownerAToken, nil, http.StatusForbidden},
		{"cross-tenant update denied", http.MethodPatch, "/api/v1/projects/" + f.projectB.Hex(), ownerAToken, bson.M{"name": "Forbidden"}, http.StatusForbidden},
		{"cross-tenant delete denied", http.MethodDelete, "/api/v1/projects/" + f.projectB.Hex(), ownerAToken, nil, http.StatusForbidden},
		{"viewer can read requirement", http.MethodGet, "/api/v1/requirements/" + requirementID.Hex(), viewerToken, nil, http.StatusOK},
		{"viewer cannot create requirement", http.MethodPost, "/api/v1/requirements", viewerToken, bson.M{"projectId": f.projectA.Hex(), "title": "Forbidden"}, http.StatusForbidden},
		{"viewer cannot update requirement", http.MethodPatch, "/api/v1/requirements/" + requirementID.Hex(), viewerToken, bson.M{"title": "Forbidden"}, http.StatusForbidden},
		{"viewer cannot delete requirement", http.MethodDelete, "/api/v1/requirements/" + requirementID.Hex(), viewerToken, nil, http.StatusForbidden},
		{"viewer cannot create baseline", http.MethodPost, "/api/v1/requirements/baseline", viewerToken, bson.M{"projectId": f.projectA.Hex()}, http.StatusForbidden},
		{"cross-tenant requirement read denied", http.MethodGet, "/api/v1/requirements/" + requirementID.Hex(), ownerBToken, nil, http.StatusForbidden},
		{"viewer can read drift", http.MethodGet, "/api/v1/drift/" + driftID.Hex(), viewerToken, nil, http.StatusOK},
		{"viewer cannot delete drift", http.MethodDelete, "/api/v1/drift/" + driftID.Hex(), viewerToken, nil, http.StatusForbidden},
		{"cross-tenant drift read denied", http.MethodGet, "/api/v1/drift/" + driftID.Hex(), ownerBToken, nil, http.StatusForbidden},
		{"viewer can read change request", http.MethodGet, "/api/v1/change-requests/" + changeRequestID.Hex(), viewerToken, nil, http.StatusOK},
		{"viewer cannot submit change request", http.MethodPost, "/api/v1/change-requests/" + changeRequestID.Hex() + "/submit", viewerToken, bson.M{}, http.StatusForbidden},
		{"viewer cannot approve change request", http.MethodPost, "/api/v1/change-requests/" + changeRequestID.Hex() + "/approve", viewerToken, bson.M{}, http.StatusForbidden},
		{"cross-tenant change request read denied", http.MethodGet, "/api/v1/change-requests/" + changeRequestID.Hex(), ownerBToken, nil, http.StatusForbidden},
		{"viewer can read file metadata", http.MethodGet, "/api/v1/files/" + fileID.Hex(), viewerToken, nil, http.StatusOK},
		{"viewer cannot delete file", http.MethodDelete, "/api/v1/files/" + fileID.Hex(), viewerToken, nil, http.StatusForbidden},
		{"cross-tenant file read denied", http.MethodGet, "/api/v1/files/" + fileID.Hex(), ownerBToken, nil, http.StatusForbidden},
		{"other tenant remains usable", http.MethodGet, "/api/v1/projects/" + f.projectB.Hex(), ownerBToken, nil, http.StatusOK},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := request(app, tt.method, tt.path, tt.bearer, tt.payload)
			if result.Code != tt.want {
				t.Fatalf("expected %d, got %d: %s", tt.want, result.Code, result.Body.String())
			}
		})
	}
}

func TestConcurrentBaselinesAreUniqueAndComplete(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	now := time.Now().UTC()
	for i := 0; i < 3; i++ {
		_, err := f.db.Collection("requirements").InsertOne(ctx, bson.M{
			"_id": primitive.NewObjectID(), "project": f.projectA, "workspace": f.workspaceA,
			"title": fmt.Sprintf("Requirement %d", i), "description": "Representative scope",
			"createdBy": f.ownerA, "updatedBy": f.ownerA, "createdAt": now, "updatedAt": now,
		})
		if err != nil {
			t.Fatalf("seed requirement: %v", err)
		}
	}
	service := requirement.NewService(f.db)
	const attempts = 12
	versions := make(chan int, attempts)
	errorsFound := make(chan error, attempts)
	var wait sync.WaitGroup
	for i := 0; i < attempts; i++ {
		wait.Add(1)
		go func() {
			defer wait.Done()
			version, err := service.Baseline(ctx, f.ownerA, requirement.BaselineRequest{ProjectID: f.projectA.Hex()})
			if err != nil {
				errorsFound <- err
				return
			}
			versions <- version.VersionNumber
		}()
	}
	wait.Wait()
	close(versions)
	close(errorsFound)
	for err := range errorsFound {
		t.Fatalf("concurrent baseline failed: %v", err)
	}
	got := make([]int, 0, attempts)
	for version := range versions {
		got = append(got, version)
	}
	sort.Ints(got)
	for i, version := range got {
		if version != i+1 {
			t.Fatalf("expected sequential unique versions 1..%d, got %v", attempts, got)
		}
	}
	cursor, err := f.db.Collection("requirementversions").Find(ctx, bson.M{"project": f.projectA})
	if err != nil {
		t.Fatal(err)
	}
	defer cursor.Close(ctx)
	for cursor.Next(ctx) {
		var version requirement.RequirementVersion
		if err := cursor.Decode(&version); err != nil {
			t.Fatal(err)
		}
		if len(version.RequirementsSnapshot) != 3 {
			t.Fatalf("baseline %d has incomplete snapshot: %d", version.VersionNumber, len(version.RequirementsSnapshot))
		}
	}
}

func TestConcurrentApprovalHasOneWinnerAndOneHistoryEvent(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	id := primitive.NewObjectID()
	now := time.Now().UTC()
	_, err := f.db.Collection("changerequests").InsertOne(ctx, bson.M{
		"_id": id, "project": f.projectA, "workspace": f.workspaceA,
		"title": "Concurrent decision", "approvalStatus": change_request.ApprovalPending,
		"createdBy": f.ownerA, "createdAt": now, "updatedAt": now,
	})
	if err != nil {
		t.Fatal(err)
	}
	service := change_request.NewService(f.db)
	results := make(chan error, 2)
	go func() { _, err := service.Approve(ctx, id, f.ownerA, "approve"); results <- err }()
	go func() { _, err := service.Reject(ctx, id, f.ownerA, "reject"); results <- err }()
	var successes int
	for i := 0; i < 2; i++ {
		if <-results == nil {
			successes++
		}
	}
	if successes != 1 {
		t.Fatalf("expected exactly one concurrent decision to win, got %d", successes)
	}
	var stored change_request.ChangeRequest
	if err := f.db.Collection("changerequests").FindOne(ctx, bson.M{"_id": id}).Decode(&stored); err != nil {
		t.Fatal(err)
	}
	if stored.ApprovalStatus != change_request.ApprovalApproved && stored.ApprovalStatus != change_request.ApprovalRejected {
		t.Fatalf("illegal final status: %s", stored.ApprovalStatus)
	}
	if len(stored.ApprovalHistory) != 1 || stored.ApprovalHistory[0].Actor != f.ownerA {
		t.Fatalf("expected one coherent approval event, got %#v", stored.ApprovalHistory)
	}
}

func TestProjectCascadeIsCompleteAndRetrySafe(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	now := time.Now().UTC()
	for _, collection := range []string{"changerequests", "driftanalyses", "requirementversions", "requirements", "files"} {
		_, err := f.db.Collection(collection).InsertOne(ctx, bson.M{
			"_id": primitive.NewObjectID(), "project": f.projectA, "workspace": f.workspaceA,
			"createdAt": now,
		})
		if err != nil {
			t.Fatalf("seed %s: %v", collection, err)
		}
	}
	for i := 0; i < 2; i++ {
		if err := lifecycle.DeleteProject(ctx, f.db, storageSvc.Service{}, f.projectA); err != nil {
			t.Fatalf("cascade attempt %d: %v", i+1, err)
		}
	}
	for _, collection := range []string{"changerequests", "driftanalyses", "requirementversions", "requirements", "files"} {
		count, err := f.db.Collection(collection).CountDocuments(ctx, bson.M{"project": f.projectA})
		if err != nil || count != 0 {
			t.Fatalf("%s descendants remain: count=%d err=%v", collection, count, err)
		}
	}
	count, err := f.db.Collection("projects").CountDocuments(ctx, bson.M{"_id": f.projectA})
	if err != nil || count != 0 {
		t.Fatalf("project remains after cascade: count=%d err=%v", count, err)
	}
}

func TestProjectCascadeStopsBeforeMetadataOrParentDeletionWhenStorageFails(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	fileID := primitive.NewObjectID()
	_, err := f.db.Collection("files").InsertOne(ctx, bson.M{
		"_id": fileID, "project": f.projectA, "workspace": f.workspaceA,
		"storagePath": "workspaces/a/projects/a/documents/test.pdf",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := lifecycle.DeleteProject(ctx, f.db, failingDeleteStorage{}, f.projectA); err == nil {
		t.Fatal("expected injected storage deletion failure")
	}
	fileCount, err := f.db.Collection("files").CountDocuments(ctx, bson.M{"_id": fileID})
	if err != nil || fileCount != 1 {
		t.Fatalf("file metadata should remain retryable: count=%d err=%v", fileCount, err)
	}
	projectCount, err := f.db.Collection("projects").CountDocuments(ctx, bson.M{"_id": f.projectA})
	if err != nil || projectCount != 1 {
		t.Fatalf("project should remain retryable: count=%d err=%v", projectCount, err)
	}
}

func TestWorkspaceCascadeIsCompleteAndRetrySafe(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	for _, collection := range []string{"changerequests", "driftanalyses", "requirementversions", "requirements", "files", "activitylogs"} {
		_, err := f.db.Collection(collection).InsertOne(ctx, bson.M{
			"_id": primitive.NewObjectID(), "project": f.projectA, "workspace": f.workspaceA,
		})
		if err != nil {
			t.Fatalf("seed %s: %v", collection, err)
		}
	}
	for i := 0; i < 2; i++ {
		if err := lifecycle.DeleteWorkspace(ctx, f.db, storageSvc.Service{}, f.workspaceA); err != nil {
			t.Fatalf("workspace cascade attempt %d: %v", i+1, err)
		}
	}
	for _, collection := range []string{"changerequests", "driftanalyses", "requirementversions", "requirements", "files", "projects", "workspacemembers", "activitylogs"} {
		count, err := f.db.Collection(collection).CountDocuments(ctx, bson.M{"workspace": f.workspaceA})
		if err != nil || count != 0 {
			t.Fatalf("%s workspace descendants remain: count=%d err=%v", collection, count, err)
		}
	}
	workspaceCount, err := f.db.Collection("workspaces").CountDocuments(ctx, bson.M{"_id": f.workspaceA})
	if err != nil || workspaceCount != 0 {
		t.Fatalf("workspace remains after cascade: count=%d err=%v", workspaceCount, err)
	}
	userCount, err := f.db.Collection("users").CountDocuments(ctx, bson.M{"_id": f.ownerA})
	if err != nil || userCount != 1 {
		t.Fatalf("workspace cascade must not delete users: count=%d err=%v", userCount, err)
	}
}
