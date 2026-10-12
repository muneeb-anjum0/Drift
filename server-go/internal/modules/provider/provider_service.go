package provider

import (
	"context"
	"errors"
	"strings"
	"time"

	"driftledger/server-go/internal/authorization"
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const TypeLocal = "local"
const TypeExternal = "openai_compatible"

var ErrInvalidConfig = errors.New("invalid provider configuration")

type ConfigRecord struct {
	ID                    primitive.ObjectID `bson:"_id"`
	Workspace             primitive.ObjectID `bson:"workspace"`
	ProviderType          string             `bson:"providerType"`
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
	DisplayName          string     `json:"displayName"`
	Endpoint             string     `json:"endpoint,omitempty"`
	Model                string     `json:"model,omitempty"`
	CredentialConfigured bool       `json:"credentialConfigured"`
	LastValidatedAt      *time.Time `json:"lastValidatedAt,omitempty"`
	LastValidationStatus string     `json:"lastValidationStatus,omitempty"`
}

type WriteRequest struct {
	ProviderType        string `json:"providerType"`
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
		return Metadata{ProviderType: TypeLocal, DisplayName: "Local model"}, nil
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
	return Metadata{ProviderType: record.ProviderType, DisplayName: record.DisplayName, Endpoint: record.Endpoint, Model: record.Model, CredentialConfigured: len(record.EncryptedCredential) > 0, LastValidatedAt: &last, LastValidationStatus: record.LastValidationStatus}
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
		saved, err := m.Resolve(ctx, workspace)
		if err != nil {
			return err
		}
		if saved.ProviderType != TypeExternal {
			return ErrInvalidConfig
		}
		input = WriteRequest{ProviderType: TypeExternal, Endpoint: saved.Endpoint, Model: saved.Model, APIKey: saved.APIKey}
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
	return nil
}

func (m Manager) Save(ctx context.Context, workspace, user primitive.ObjectID, input WriteRequest) (Metadata, error) {
	if err := authorization.RequireWorkspaceCapability(ctx, m.db, workspace, user, authorization.CapabilityManageWorkspace); err != nil {
		return Metadata{}, err
	}
	if input.ProviderType == TypeLocal {
		if err := m.Remove(ctx, workspace, user); err != nil {
			return Metadata{}, err
		}
		return Metadata{ProviderType: TypeLocal, DisplayName: "Local model"}, nil
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
	if strings.TrimSpace(input.DisplayName) == "" {
		input.DisplayName = "OpenAI-compatible"
	}
	ciphertext, nonce, err := m.cipher.encrypt(workspace, workspace, TypeExternal, input.APIKey)
	if err != nil {
		return Metadata{}, err
	}
	now := time.Now().UTC()
	update := bson.M{"$set": bson.M{
		"workspace": workspace, "providerType": TypeExternal, "displayName": input.DisplayName,
		"endpoint": endpoint, "model": input.Model, "encryptedCredential": ciphertext,
		"credentialNonce": nonce, "credentialKeyVersion": credentialKeyVersion,
		"updatedBy": user, "updatedAt": now, "lastValidatedAt": now, "lastValidationStatus": "valid", "privacyAcknowledgedAt": now,
	}, "$setOnInsert": bson.M{"createdBy": user, "createdAt": now}}
	if _, err := m.collection().UpdateOne(ctx, bson.M{"_id": workspace}, update, options.Update().SetUpsert(true)); err != nil {
		return Metadata{}, err
	}
	return Metadata{ProviderType: TypeExternal, DisplayName: input.DisplayName, Endpoint: endpoint, Model: input.Model, CredentialConfigured: true, LastValidatedAt: &now, LastValidationStatus: "valid"}, nil
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
