package provider

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"driftledger/backend/internal/config"
	"driftledger/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestMongoCredentialLifecycleAndTenantIsolation(t *testing.T) {
	uri := os.Getenv("MONGO_TEST_URI")
	if uri == "" {
		t.Skip("set MONGO_TEST_URI for isolated provider storage test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Fatal(err)
	}
	db := client.Database("drift_provider_test_" + primitive.NewObjectID().Hex())
	t.Cleanup(func() {
		cleanup, stop := context.WithTimeout(context.Background(), 10*time.Second)
		defer stop()
		_ = db.Drop(cleanup)
		_ = client.Disconnect(cleanup)
	})
	workspaceA, workspaceB := primitive.NewObjectID(), primitive.NewObjectID()
	ownerA, ownerB, adminA, memberA, viewerA := primitive.NewObjectID(), primitive.NewObjectID(), primitive.NewObjectID(), primitive.NewObjectID(), primitive.NewObjectID()
	for _, entry := range []struct {
		workspace, user primitive.ObjectID
		role            string
	}{
		{workspaceA, ownerA, "owner"}, {workspaceA, adminA, "admin"}, {workspaceA, memberA, "member"}, {workspaceA, viewerA, "viewer"}, {workspaceB, ownerB, "owner"},
	} {
		if _, err := db.Collection("workspacemembers").InsertOne(ctx, bson.M{"workspace": entry.workspace, "user": entry.user, "role": entry.role}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.Collection("projects").InsertOne(ctx, bson.M{"workspace": workspaceA, "name": "Project survives provider deletion"}); err != nil {
		t.Fatal(err)
	}
	key := base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{4}, 32))
	manager, err := NewManager(db, config.Config{ProviderMasterKey: key})
	if err != nil {
		t.Fatal(err)
	}
	tests := 0
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" || r.Method != http.MethodPost {
			t.Error("connection test used the wrong mock route")
		}
		if r.Header.Get("Authorization") == "Bearer reject-token" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"{\"label\":\"unchanged\"}"}}]}`))
	}))
	defer mock.Close()
	manager.testConnection = func(ctx context.Context, input WriteRequest) error {
		tests++
		client := mockClient(mock)
		client.key = input.APIKey
		return client.Test(ctx)
	}
	input := WriteRequest{ProviderType: TypeExternal, DisplayName: "Mock", Endpoint: "https://api.example.com/v1", Model: "mock-model", APIKey: "first-token", PrivacyAcknowledged: true}
	badDisplay := input
	badDisplay.DisplayName = "first-token"
	if _, err := manager.Save(ctx, workspaceA, ownerA, badDisplay); !errors.Is(err, ErrInvalidConfig) {
		t.Fatal("secret mirrored into safe metadata field")
	}
	for _, user := range []primitive.ObjectID{viewerA, memberA} {
		if _, err := manager.Save(ctx, workspaceA, user, input); !errors.Is(err, utils.ErrForbidden) {
			t.Fatal("non-manager wrote provider config")
		}
		if err := manager.Test(ctx, workspaceA, user, input); !errors.Is(err, utils.ErrForbidden) {
			t.Fatal("non-manager tested provider")
		}
	}
	if _, err := manager.Save(ctx, workspaceB, ownerA, input); !errors.Is(err, utils.ErrForbidden) {
		t.Fatal("cross-tenant provider write succeeded")
	}
	if _, err := manager.Save(ctx, workspaceA, ownerA, WriteRequest{ProviderType: TypeExternal, Endpoint: input.Endpoint, Model: input.Model, APIKey: input.APIKey}); !errors.Is(err, ErrInvalidConfig) {
		t.Fatal("missing privacy acknowledgment accepted")
	}
	metadata, err := manager.Save(ctx, workspaceA, ownerA, input)
	if err != nil || !metadata.CredentialConfigured || tests != 1 {
		t.Fatalf("owner save failed: %#v %v", metadata, err)
	}
	serialized, _ := json.Marshal(metadata)
	if strings.Contains(string(serialized), "first-token") || strings.Contains(string(serialized), "encryptedCredential") {
		t.Fatal("secret leaked in metadata")
	}
	readMetadata, err := manager.Metadata(ctx, workspaceA, memberA)
	if err != nil {
		t.Fatal(err)
	}
	serialized, _ = json.Marshal(readMetadata)
	if strings.Contains(string(serialized), "first-token") || strings.Contains(string(serialized), "encryptedCredential") || !readMetadata.CredentialConfigured {
		t.Fatal("provider settings read leaked the saved secret")
	}
	var stored ConfigRecord
	if err := db.Collection("workspaceproviderconfigs").FindOne(ctx, bson.M{"_id": workspaceA}).Decode(&stored); err != nil {
		t.Fatal(err)
	}
	if stored.ID != workspaceA || stored.Workspace != workspaceA || stored.CredentialKeyVersion != 1 || len(stored.CredentialNonce) != 12 || len(stored.EncryptedCredential) == 0 || bytes.Contains(stored.EncryptedCredential, []byte("first-token")) {
		t.Fatal("stored credential is not tenant-bound encrypted data")
	}
	oldCiphertext, oldNonce := bytes.Clone(stored.EncryptedCredential), bytes.Clone(stored.CredentialNonce)
	restarted, err := NewManager(db, config.Config{ProviderMasterKey: key})
	if err != nil {
		t.Fatal(err)
	}
	connected, err := restarted.Resolve(ctx, workspaceA)
	if err != nil || connected.APIKey != "first-token" {
		t.Fatal("restart did not preserve encrypted credential")
	}
	wrongKey, _ := NewManager(db, config.Config{ProviderMasterKey: base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{5}, 32))})
	if _, err := wrongKey.Resolve(ctx, workspaceA); !errors.Is(err, ErrCredentialInvalid) {
		t.Fatal("wrong master key did not fail closed")
	}
	missingKey, _ := NewManager(db, config.Config{})
	if _, err := missingKey.Resolve(ctx, workspaceA); !errors.Is(err, ErrMasterKeyUnavailable) {
		t.Fatal("missing master key did not fail closed")
	}
	input.APIKey = "reject-token"
	if _, err := manager.Save(ctx, workspaceA, adminA, input); !errors.Is(err, ErrProviderAuthentication) {
		t.Fatal("failed connection test changed config")
	}
	input.APIKey = "second-token"
	if _, err := manager.Save(ctx, workspaceA, adminA, input); err != nil {
		t.Fatal(err)
	}
	if err := db.Collection("workspaceproviderconfigs").FindOne(ctx, bson.M{"_id": workspaceA}).Decode(&stored); err != nil {
		t.Fatal(err)
	}
	if bytes.Equal(stored.EncryptedCredential, oldCiphertext) || bytes.Equal(stored.CredentialNonce, oldNonce) {
		t.Fatal("credential replacement reused ciphertext or nonce")
	}
	connected, err = restarted.Resolve(ctx, workspaceA)
	if err != nil || connected.APIKey != "second-token" {
		t.Fatal("replacement did not atomically become current")
	}
	var savedTestKey string
	restarted.testConnection = func(ctx context.Context, current WriteRequest) error {
		savedTestKey = current.APIKey
		client := mockClient(mock)
		client.key = current.APIKey
		return client.Test(ctx)
	}
	if err := restarted.Test(ctx, workspaceA, ownerA, WriteRequest{}); err != nil || savedTestKey != "second-token" {
		t.Fatal("saved connection did not use only the replacement credential")
	}
	if _, err := manager.Metadata(ctx, workspaceB, ownerA); !errors.Is(err, utils.ErrForbidden) {
		t.Fatal("cross-tenant metadata read succeeded")
	}
	if err := manager.Test(ctx, workspaceB, ownerA, input); !errors.Is(err, utils.ErrForbidden) {
		t.Fatal("cross-tenant credential test succeeded")
	}
	if err := manager.Remove(ctx, workspaceB, ownerA); !errors.Is(err, utils.ErrForbidden) {
		t.Fatal("cross-tenant delete succeeded")
	}
	localMetadata, err := manager.SetMode(ctx, workspaceA, ownerA, TypeLocal)
	if err != nil || localMetadata.ProviderType != TypeLocal || !localMetadata.CredentialConfigured || localMetadata.Model != input.Model {
		t.Fatal("local mode did not retain the saved online settings")
	}
	localConnection, err := manager.Resolve(ctx, workspaceA)
	if err != nil || localConnection.ProviderType != TypeLocal || localConnection.APIKey != "" {
		t.Fatal("local mode routed through the saved online key")
	}
	restarted.testConnection = func(context.Context, WriteRequest) error { return ErrProviderAuthentication }
	if _, err := restarted.SetMode(ctx, workspaceA, ownerA, TypeExternal); !errors.Is(err, ErrProviderAuthentication) {
		t.Fatal("failed reconnection activated the online provider")
	}
	localConnection, err = manager.Resolve(ctx, workspaceA)
	if err != nil || localConnection.ProviderType != TypeLocal {
		t.Fatal("failed reconnection changed the active mode")
	}
	onlineMetadata, err := manager.SetMode(ctx, workspaceA, ownerA, TypeExternal)
	if err != nil || onlineMetadata.ProviderType != TypeExternal {
		t.Fatalf("saved provider could not be reactivated: %v", err)
	}
	connected, err = manager.Resolve(ctx, workspaceA)
	if err != nil || connected.APIKey != "second-token" {
		t.Fatal("reactivated provider did not use the retained encrypted key")
	}
	if err := manager.Remove(ctx, workspaceA, ownerA); err != nil {
		t.Fatal(err)
	}
	local, err := manager.Resolve(ctx, workspaceA)
	if err != nil || local.ProviderType != TypeLocal {
		t.Fatal("delete did not restore local mode")
	}
	count, err := db.Collection("projects").CountDocuments(ctx, bson.M{"workspace": workspaceA})
	if err != nil || count != 1 {
		t.Fatal("provider deletion altered project data")
	}
}
