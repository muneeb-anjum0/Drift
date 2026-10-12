package drift

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"driftledger/server-go/internal/authorization"
	"driftledger/server-go/internal/modules/activity"
	"driftledger/server-go/internal/modules/requirement"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const previewLifetime = 10 * time.Minute

var (
	ErrPreviewUnavailable = errors.New("analysis preview not found or already used")
	ErrPreviewExpired     = errors.New("analysis preview expired")
	ErrPreviewCorrupt     = errors.New("analysis preview invalid")
)

// Preview records contain the analyzed text/result, but never provider credentials.
// Mongo's TTL index removes abandoned records; save checks expiry independently.
type previewRecord struct {
	ID              string             `bson:"_id"`
	User            primitive.ObjectID `bson:"user"`
	Workspace       primitive.ObjectID `bson:"workspace"`
	Project         primitive.ObjectID `bson:"project"`
	BaselineVersion primitive.ObjectID `bson:"baselineVersion"`
	InputSHA256     string             `bson:"inputSha256"`
	ProviderType    string             `bson:"providerType"`
	CreatedAt       time.Time          `bson:"createdAt"`
	ExpiresAt       time.Time          `bson:"expiresAt"`
	Analysis        AnalysisPreview    `bson:"analysis"`
}

func inputSHA256(input string) string {
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])
}

func (s Service) storePreview(ctx context.Context, user, project, workspace, baseline primitive.ObjectID, analysis *AnalysisPreview) error {
	var id [32]byte
	if _, err := rand.Read(id[:]); err != nil {
		return err
	}
	now := time.Now().UTC()
	record := previewRecord{
		ID: hex.EncodeToString(id[:]), User: user, Project: project, Workspace: workspace,
		BaselineVersion: baseline, InputSHA256: inputSHA256(analysis.InputText),
		ProviderType: analysis.AnalysisEngine, CreatedAt: now, ExpiresAt: now.Add(previewLifetime),
		Analysis: *analysis,
	}
	if _, err := s.db.Collection("analysispreviews").InsertOne(ctx, record); err != nil {
		return err
	}
	analysis.PreviewID = record.ID
	return nil
}

func validPreview(record previewRecord, version requirement.RequirementVersion) bool {
	a := record.Analysis
	return record.ID != "" && !record.User.IsZero() && !record.Workspace.IsZero() &&
		!record.CreatedAt.IsZero() && record.ExpiresAt.After(record.CreatedAt) &&
		a.ProjectID == record.Project.Hex() && a.WorkspaceID == record.Workspace.Hex() &&
		a.BaselineVersionID == record.BaselineVersion.Hex() && a.BaselineVersionNumber == version.VersionNumber &&
		a.InputText != "" && inputSHA256(a.InputText) == record.InputSHA256 &&
		a.AnalysisEngine == record.ProviderType && (a.AnalysisEngine == "qwen_lora" || a.AnalysisEngine == "openai_compatible" || a.AnalysisEngine == "rule_based")
}

func (s Service) Save(ctx context.Context, userID primitive.ObjectID, p SaveRequest) (DriftAnalysis, error) {
	var record previewRecord
	filter := bson.M{"_id": p.PreviewID, "user": userID}
	if err := s.db.Collection("analysispreviews").FindOne(ctx, filter).Decode(&record); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return DriftAnalysis{}, ErrPreviewUnavailable
		}
		return DriftAnalysis{}, err
	}
	project, err := authorization.RequireProjectCapability(ctx, s.db, record.Project, userID, authorization.CapabilityWrite)
	if err != nil {
		return DriftAnalysis{}, err
	}
	if project.Workspace != record.Workspace {
		return DriftAnalysis{}, ErrPreviewCorrupt
	}
	var version requirement.RequirementVersion
	if err := s.db.Collection("requirementversions").FindOne(ctx, bson.M{
		"_id": record.BaselineVersion, "project": record.Project, "workspace": record.Workspace,
	}).Decode(&version); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return DriftAnalysis{}, utils.ErrNotFound
		}
		return DriftAnalysis{}, err
	}
	now := time.Now().UTC()
	if !record.ExpiresAt.After(now) {
		return DriftAnalysis{}, ErrPreviewExpired
	}
	if !validPreview(record, version) {
		return DriftAnalysis{}, ErrPreviewCorrupt
	}
	// A conditional atomic delete permits only one concurrent save. If the later
	// insert fails, the preview stays consumed; the user must compare again.
	consume := bson.M{"_id": p.PreviewID, "user": userID, "project": record.Project,
		"workspace": record.Workspace, "baselineVersion": record.BaselineVersion,
		"expiresAt": bson.M{"$gt": now}}
	var consumed previewRecord
	if err := s.db.Collection("analysispreviews").FindOneAndDelete(ctx, consume).Decode(&consumed); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return DriftAnalysis{}, ErrPreviewUnavailable
		}
		return DriftAnalysis{}, err
	}
	if !validPreview(consumed, version) {
		return DriftAnalysis{}, ErrPreviewCorrupt
	}
	a := consumed.Analysis
	analysis := DriftAnalysis{
		ID: utils.NewID(), Project: consumed.Project, Workspace: consumed.Workspace,
		BaselineVersion: consumed.BaselineVersion, BaselineVersionNumber: version.VersionNumber,
		InputType: a.InputType, InputText: a.InputText, DriftScore: a.DriftScore,
		RiskLevel: a.RiskLevel, Summary: a.Summary, DetectedChanges: a.DetectedChanges,
		RequirementResults: a.RequirementResults, AddedCount: a.AddedCount,
		ModifiedCount: a.ModifiedCount, RemovedCount: a.RemovedCount,
		AmbiguousCount: a.AmbiguousCount, ContradictionCount: a.ContradictionCount,
		EstimatedExtraHours: a.EstimatedExtraHours, AnalysisEngine: a.AnalysisEngine,
		ProvenanceVersion: "server_bound_v1", Status: "saved", CreatedBy: userID,
		CreatedAt: now, UpdatedAt: now,
	}
	if _, err := s.db.Collection("driftanalyses").InsertOne(ctx, analysis); err != nil {
		return DriftAnalysis{}, err
	}
	activity.Log(ctx, s.db, consumed.Workspace, userID, "DRIFT_ANALYSIS_CREATED", "DriftAnalysis", analysis.ID.Hex(), bson.M{
		"projectId": consumed.Project.Hex(), "projectName": project.Name,
		"inputType": analysis.InputType, "inputText": activitySnippet(analysis.InputText),
		"summary": activitySnippet(analysis.Summary), "driftScore": analysis.DriftScore,
		"riskLevel": analysis.RiskLevel,
	})
	return analysis, nil
}
