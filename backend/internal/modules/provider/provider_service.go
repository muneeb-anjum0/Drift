package provider

import (
	"context"
	"errors"
	"strings"
	"time"

	"driftledger/backend/internal/authorization"
	"driftledger/backend/internal/config"
	"driftledger/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const TypeLocal = "local"
const TypeExternal = "openai_compatible"

const (
	ProviderOpenAI   = "openai"
	ProviderGemini   = "gemini"
	ProviderDeepSeek = "deepseek"
	ProviderCustom   = "custom"
)

var providerEndpoints = map[string]string{
	ProviderOpenAI:   "https://api.openai.com/v1",
	ProviderGemini:   "https://generativelanguage.googleapis.com/v1beta/openai",
	ProviderDeepSeek: "https://api.deepseek.com",
}

func providerIDForEndpoint(endpoint string) string {
	for id, known := range providerEndpoints {
		if endpoint == known {
			return id
		}
	}
	return ProviderCustom
}

var ErrInvalidConfig = errors.New("invalid provider configuration")

type ConfigRecord struct {
	ID                    primitive.ObjectID `bson:"_id"`
	Workspace             primitive.ObjectID `bson:"workspace"`
	ProviderType          string             `bson:"providerType"`
	ActiveMode            string             `bson:"activeMode,omitempty"`
	ProviderID            string             `bson:"providerId,omitempty"`
	DisplayName           string             `bson:"displayName"`
	Endpoint              string             `bson:"endpoint"`
	Model                 string             `bson:"model"`
	EncryptedCredential   []byte             `bson:"encryptedCredential"`
	CredentialNonce       []byte             `bson:"credentialNonce"`
	CredentialKeyVersion  int                `bson:"credentialKeyVersion"`
	CreatedBy             primitive.ObjectID `bson:"createdBy"`
	UpdatedBy             primitive.ObjectID `bson:"updatedBy"`
	LastValidatedAt       time.Time          `bson:"lastValidatedAt"`
	LastValidationStatus  string             `bson:"lastValidationStatus"`
	PrivacyAcknowledgedAt time.Time          `bson:"privacyAcknowledgedAt"`
	CreatedAt             time.Time          `bson:"createdAt"`
	UpdatedAt             time.Time          `bson:"updatedAt"`
}

type Metadata struct {
	ProviderType         string     `json:"providerType"`
	ActiveMode           string     `json:"activeMode"`
	ProviderID           string     `json:"providerId,omitempty"`
	DisplayName          string     `json:"displayName"`
	Endpoint             string     `json:"endpoint,omitempty"`
	Model                string     `json:"model,omitempty"`
	CredentialConfigured bool       `json:"credentialConfigured"`
	LastValidatedAt      *time.Time `json:"lastValidatedAt,omitempty"`
	LastValidationStatus string     `json:"lastValidationStatus,omitempty"`
}

type WriteRequest struct {
	ProviderType        string `json:"providerType"`
	ProviderID          string `json:"providerId"`
	DisplayName         string `json:"displayName"`
	Endpoint            string `json:"endpoint"`
	Model               string `json:"model"`
	APIKey              string `json:"apiKey"`
	PrivacyAcknowledged bool   `json:"privacyAcknowledged"`
}

type Connection struct {
	ProviderType string
	DisplayName  string
	Endpoint     string
	Model        string
	APIKey       string
}

type Manager struct {
	db             *mongo.Database
	cipher         credentialCipher
	testConnection func(context.Context, WriteRequest) error
}

func NewManager(db *mongo.Database, cfg config.Config) (Manager, error) {
	cipher, err := newCredentialCipher(cfg.ProviderMasterKey)
	return Manager{db: db, cipher: cipher, testConnection: func(ctx context.Context, input WriteRequest) error {
		client, err := NewClient(input.Endpoint, input.Model, input.APIKey, cfg.DriftRelevanceThreshold, cfg.DriftMaxAnalyzedRequirements)
		if err != nil {
			return ErrInvalidConfig
		}
		return client.Test(ctx)
	}}, err
}

func (m Manager) collection() *mongo.Collection { return m.db.Collection("workspaceproviderconfigs") }

func (m Manager) Metadata(ctx context.Context, workspace, user primitive.ObjectID) (Metadata, error) {
	if err := authorization.RequireWorkspaceCapability(ctx, m.db, workspace, user, authorization.CapabilityRead); err != nil {
		return Metadata{}, err
	}
	var record ConfigRecord
	err := m.collection().FindOne(ctx, bson.M{"_id": workspace}).Decode(&record)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return Metadata{ProviderType: TypeLocal, ActiveMode: TypeLocal, DisplayName: "Local model"}, nil
	}
	if err != nil {
		return Metadata{}, err
	}
	if record.Workspace != workspace || record.ProviderType != TypeExternal {
		return Metadata{}, ErrInvalidConfig
	}
	return safeMetadata(record), nil
}

func safeMetadata(record ConfigRecord) Metadata {
	last := record.LastValidatedAt
	id := record.ProviderID
	if id == "" {
		id = providerIDForEndpoint(record.Endpoint)
	}
	mode := record.ActiveMode
	if mode == "" {
		mode = TypeExternal // Existing records predate the mode field.
	}
	return Metadata{ProviderType: mode, ActiveMode: mode, ProviderID: id, DisplayName: record.DisplayName, Endpoint: record.Endpoint, Model: record.Model, CredentialConfigured: len(record.EncryptedCredential) > 0, LastValidatedAt: &last, LastValidationStatus: record.LastValidationStatus}
}

// Resolve must be called only after the project and user have been authorized.
// The caller derives workspace from the persisted project, never request input.
func (m Manager) Resolve(ctx context.Context, workspace primitive.ObjectID) (Connection, error) {
	var record ConfigRecord
	err := m.collection().FindOne(ctx, bson.M{"_id": workspace}).Decode(&record)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return Connection{ProviderType: TypeLocal, DisplayName: "Local model"}, nil
	}
	if err != nil {
		return Connection{}, err
	}
	if record.Workspace != workspace || record.ProviderType != TypeExternal {
		return Connection{}, ErrInvalidConfig
	}
	if record.ActiveMode == TypeLocal {
		return Connection{ProviderType: TypeLocal, DisplayName: "Local model"}, nil
	}
	return m.connectionFromRecord(workspace, record)
}

func (m Manager) connectionFromRecord(workspace primitive.ObjectID, record ConfigRecord) (Connection, error) {
	key, err := m.cipher.decrypt(workspace, record.ID, record.ProviderType, record.EncryptedCredential, record.CredentialNonce, record.CredentialKeyVersion)
	if err != nil {
		return Connection{}, err
	}
	return Connection{ProviderType: record.ProviderType, DisplayName: record.DisplayName, Endpoint: record.Endpoint, Model: record.Model, APIKey: key}, nil
}

func (m Manager) Test(ctx context.Context, workspace, user primitive.ObjectID, input WriteRequest) error {
	if err := authorization.RequireWorkspaceCapability(ctx, m.db, workspace, user, authorization.CapabilityManageWorkspace); err != nil {
		return err
	}
	if input.APIKey == "" {
		if input.ProviderType != "" || input.Endpoint != "" || input.Model != "" {
			return ErrInvalidConfig
		}
		var record ConfigRecord
		err := m.collection().FindOne(ctx, bson.M{"_id": workspace}).Decode(&record)
		if err != nil {
			return err
		}
		if record.Workspace != workspace || record.ProviderType != TypeExternal {
			return ErrInvalidConfig
		}
		saved, err := m.connectionFromRecord(workspace, record)
		if err != nil {
			return err
		}
		input = WriteRequest{ProviderType: TypeExternal, ProviderID: providerIDForEndpoint(saved.Endpoint), Endpoint: saved.Endpoint, Model: saved.Model, APIKey: saved.APIKey}
	}
	if err := validateExternalInput(input); err != nil {
		return err
	}
	return m.testConnection(ctx, input)
}

func validateExternalInput(input WriteRequest) error {
	if input.ProviderType != TypeExternal || len(input.APIKey) < 8 || len(input.APIKey) > 4096 || strings.TrimSpace(input.APIKey) != input.APIKey ||
		len(input.Model) == 0 || len(input.Model) > 160 || strings.TrimSpace(input.Model) != input.Model ||
		len(input.DisplayName) > 80 {
		return ErrInvalidConfig
	}
	if strings.Contains(input.DisplayName, input.APIKey) || strings.Contains(input.Model, input.APIKey) || strings.Contains(input.Endpoint, input.APIKey) {
		return ErrInvalidConfig
	}
	if _, err := ValidateEndpoint(input.Endpoint); err != nil {
		return ErrInvalidConfig
	}
	if input.ProviderID != "" && input.ProviderID != ProviderCustom {
		known, ok := providerEndpoints[input.ProviderID]
		if !ok || input.Endpoint != known {
			return ErrInvalidConfig
		}
	}
	return nil
}

func (m Manager) Save(ctx context.Context, workspace, user primitive.ObjectID, input WriteRequest) (Metadata, error) {
	if err := authorization.RequireWorkspaceCapability(ctx, m.db, workspace, user, authorization.CapabilityManageWorkspace); err != nil {
		return Metadata{}, err
	}
	if input.ProviderType == TypeLocal {
		return m.SetMode(ctx, workspace, user, TypeLocal)
	}
	if !input.PrivacyAcknowledged {
		return Metadata{}, ErrInvalidConfig
	}
	if err := validateExternalInput(input); err != nil {
		return Metadata{}, err
	}
	if len(m.cipher.key) != 32 {
		return Metadata{}, ErrMasterKeyUnavailable
	}
	// A successful test is mandatory before any credential is stored.
	if err := m.Test(ctx, workspace, user, input); err != nil {
		return Metadata{}, err
	}
	if err := authorization.RequireWorkspaceCapability(ctx, m.db, workspace, user, authorization.CapabilityManageWorkspace); err != nil {
		return Metadata{}, err
	}
	endpoint, _ := ValidateEndpoint(input.Endpoint)
	providerID := input.ProviderID
	if providerID == "" {
		providerID = providerIDForEndpoint(endpoint)
	}
	if strings.TrimSpace(input.DisplayName) == "" {
		input.DisplayName = "OpenAI-compatible"
	}
	ciphertext, nonce, err := m.cipher.encrypt(workspace, workspace, TypeExternal, input.APIKey)
	if err != nil {
		return Metadata{}, err
	}
	now := time.Now().UTC()
	update := bson.M{"$set": bson.M{
		"workspace": workspace, "providerType": TypeExternal, "activeMode": TypeExternal, "providerId": providerID, "displayName": input.DisplayName,
		"endpoint": endpoint, "model": input.Model, "encryptedCredential": ciphertext,
		"credentialNonce": nonce, "credentialKeyVersion": credentialKeyVersion,
		"updatedBy": user, "updatedAt": now, "lastValidatedAt": now, "lastValidationStatus": "valid", "privacyAcknowledgedAt": now,
	}, "$setOnInsert": bson.M{"createdBy": user, "createdAt": now}}
	if _, err := m.collection().UpdateOne(ctx, bson.M{"_id": workspace}, update, options.Update().SetUpsert(true)); err != nil {
		return Metadata{}, err
	}
	return Metadata{ProviderType: TypeExternal, ActiveMode: TypeExternal, ProviderID: providerID, DisplayName: input.DisplayName, Endpoint: endpoint, Model: input.Model, CredentialConfigured: true, LastValidatedAt: &now, LastValidationStatus: "valid"}, nil
}

// SetMode changes routing while retaining the encrypted online configuration.
// Reactivating online mode tests the saved credential before changing routing.
func (m Manager) SetMode(ctx context.Context, workspace, user primitive.ObjectID, mode string) (Metadata, error) {
	if mode != TypeLocal && mode != TypeExternal {
		return Metadata{}, ErrInvalidConfig
	}
	if err := authorization.RequireWorkspaceCapability(ctx, m.db, workspace, user, authorization.CapabilityManageWorkspace); err != nil {
		return Metadata{}, err
	}
	var record ConfigRecord
	err := m.collection().FindOne(ctx, bson.M{"_id": workspace}).Decode(&record)
	if errors.Is(err, mongo.ErrNoDocuments) && mode == TypeLocal {
		return Metadata{ProviderType: TypeLocal, ActiveMode: TypeLocal, DisplayName: "Local model"}, nil
	}
	if err != nil {
		return Metadata{}, err
	}
	if record.Workspace != workspace || record.ProviderType != TypeExternal {
		return Metadata{}, ErrInvalidConfig
	}
	if mode == TypeExternal {
		if err := m.Test(ctx, workspace, user, WriteRequest{}); err != nil {
			return Metadata{}, err
		}
	}
	if err := authorization.RequireWorkspaceCapability(ctx, m.db, workspace, user, authorization.CapabilityManageWorkspace); err != nil {
		return Metadata{}, err
	}
	update := bson.M{"activeMode": mode, "updatedBy": user, "updatedAt": time.Now().UTC()}
	if mode == TypeExternal {
		update["lastValidatedAt"] = time.Now().UTC()
		update["lastValidationStatus"] = "valid"
	}
	filter := bson.M{"_id": workspace, "workspace": workspace, "providerType": TypeExternal}
	if mode == TypeExternal {
		// Do not activate a different credential if another manager replaced it
		// after the connection test completed.
		filter["credentialNonce"] = record.CredentialNonce
		filter["encryptedCredential"] = record.EncryptedCredential
	}
	result, err := m.collection().UpdateOne(ctx, filter, bson.M{"$set": update})
	if err != nil {
		return Metadata{}, err
	}
	if result.MatchedCount != 1 {
		return Metadata{}, ErrInvalidConfig
	}
	record.ActiveMode = mode
	if mode == TypeExternal {
		record.LastValidatedAt = update["lastValidatedAt"].(time.Time)
		record.LastValidationStatus = "valid"
	}
	return safeMetadata(record), nil
}

func (m Manager) Remove(ctx context.Context, workspace, user primitive.ObjectID) error {
	if err := authorization.RequireWorkspaceCapability(ctx, m.db, workspace, user, authorization.CapabilityManageWorkspace); err != nil {
		return err
	}
	_, err := m.collection().DeleteOne(ctx, bson.M{"_id": workspace})
	return err
}

func ParseWorkspaceID(raw string) (primitive.ObjectID, error) {
	id, err := utils.ObjectID(raw)
	if err != nil {
		return primitive.NilObjectID, ErrInvalidConfig
	}
	return id, nil
}
