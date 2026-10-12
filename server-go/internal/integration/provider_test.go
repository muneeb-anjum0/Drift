package integration_test

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/router"
	storageSvc "driftledger/server-go/internal/storage"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestProviderMetadataAuthorizationAndRemoval(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	admin, member := primitive.NewObjectID(), primitive.NewObjectID()
	for _, entry := range []struct {
		id    primitive.ObjectID
		role  string
		email string
	}{
		{admin, "admin", "admin-provider@example.test"},
		{member, "member", "member-provider@example.test"},
	} {
		if _, err := f.db.Collection("users").InsertOne(ctx, bson.M{"_id": entry.id, "name": entry.role, "email": entry.email}); err != nil {
			t.Fatal(err)
		}
		if _, err := f.db.Collection("workspacemembers").InsertOne(ctx, bson.M{"_id": primitive.NewObjectID(), "workspace": f.workspaceA, "user": entry.id, "role": entry.role}); err != nil {
			t.Fatal(err)
		}
	}
	// A deliberately opaque fixture proves GET never serializes stored fields.
	if _, err := f.db.Collection("workspaceproviderconfigs").InsertOne(ctx, bson.M{
		"_id": f.workspaceA, "workspace": f.workspaceA,
		"providerType": "openai_compatible", "displayName": "Fixture provider",
		"endpoint": "https://api.example.com/v1", "model": "mock-model",
		"encryptedCredential": []byte("opaque-fixture-only"), "credentialNonce": []byte("nonce-fixture"),
		"credentialKeyVersion": 1, "lastValidatedAt": time.Now().UTC(), "lastValidationStatus": "valid",
	}); err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{AppEnv: "test", JWTSecret: testJWTSecret, JWTExpiresInHours: 1, AuthRateLimitRequests: 100, InferenceRateLimitRequests: 100, RateLimitWindow: time.Minute, MaxUploadSizeMB: 1}
	app := router.New(f.db, cfg, storageSvc.Service{})
	base := "/api/v1/workspaces/" + f.workspaceA.Hex() + "/provider"
	ownerToken := token(t, f.ownerA, "owner-a@example.test")
	adminToken := token(t, admin, "admin-provider@example.test")
	memberToken := token(t, member, "member-provider@example.test")
	viewerToken := token(t, f.viewerA, "viewer-a@example.test")
	otherToken := token(t, f.ownerB, "owner-b@example.test")
	for _, bearer := range []string{ownerToken, adminToken, memberToken, viewerToken} {
		result := request(app, http.MethodGet, base, bearer, nil)
		if result.Code != http.StatusOK {
			t.Fatalf("member metadata read failed: %d", result.Code)
		}
		for _, forbidden := range []string{"opaque-fixture-only", "encryptedCredential", "credentialNonce", "credentialKeyVersion", "apiKey"} {
			if strings.Contains(result.Body.String(), forbidden) {
				t.Fatalf("secret field appeared in metadata response: %s", forbidden)
			}
		}
	}
	for _, tc := range []struct {
		method, path, bearer string
		payload              any
		want                 int
	}{
		{http.MethodGet, base, otherToken, nil, http.StatusForbidden},
		{http.MethodPost, base + "/test", viewerToken, bson.M{}, http.StatusForbidden},
		{http.MethodPost, base + "/test", memberToken, bson.M{}, http.StatusForbidden},
		{http.MethodPut, base, viewerToken, bson.M{"providerType": "local"}, http.StatusForbidden},
		{http.MethodPut, base, memberToken, bson.M{"providerType": "local"}, http.StatusForbidden},
		{http.MethodDelete, base, otherToken, nil, http.StatusForbidden},
		{http.MethodDelete, base, viewerToken, nil, http.StatusForbidden},
		{http.MethodDelete, base, memberToken, nil, http.StatusForbidden},
	} {
		result := request(app, tc.method, tc.path, tc.bearer, tc.payload)
		if result.Code != tc.want {
			t.Fatalf("provider authorization: %s %s got %d expected %d", tc.method, tc.path, result.Code, tc.want)
		}
	}
	if result := request(app, http.MethodPut, base, adminToken, bson.M{"providerType": "local"}); result.Code != http.StatusOK {
		t.Fatalf("admin could not switch to local: %d", result.Code)
	}
	count, err := f.db.Collection("workspaceproviderconfigs").CountDocuments(ctx, bson.M{"_id": f.workspaceA})
	if err != nil || count != 0 {
		t.Fatal("external credential was not removed")
	}
	if result := request(app, http.MethodDelete, base, ownerToken, nil); result.Code != http.StatusOK {
		t.Fatalf("owner could not remove provider: %d", result.Code)
	}
	projects, err := f.db.Collection("projects").CountDocuments(ctx, bson.M{"workspace": f.workspaceA})
	if err != nil || projects != 1 {
		t.Fatal("provider removal altered project data")
	}
}
