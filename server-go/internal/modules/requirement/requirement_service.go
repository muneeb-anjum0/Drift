package requirement

import (
	"context"
	"errors"
	"fmt"
	"time"

	"driftledger/server-go/internal/modules/activity"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service struct{ db *mongo.Database }

func NewService(db *mongo.Database) Service { return Service{db: db} }

func (s Service) Create(ctx context.Context, userID primitive.ObjectID, p CreateRequirementRequest) (Requirement, error) {
	projectID, err := utils.ObjectID(p.ProjectID)
	if err != nil {
		return Requirement{}, err
	}
	project, err := utils.RequireProjectAccess(ctx, s.db, projectID, userID)
	if err != nil {
		return Requirement{}, err
	}
	if p.WorkspaceID != "" && p.WorkspaceID != project.Workspace.Hex() {
		return Requirement{}, utils.ErrForbidden
	}
	now := time.Now().UTC()
	req := Requirement{ID: utils.NewID(), Project: projectID, Workspace: project.Workspace, Title: p.Title, Description: p.Description, Type: def(p.Type, "functional"), Priority: def(p.Priority, "medium"), Status: def(p.Status, "proposed"), Source: def(p.Source, "manual"), SourceText: p.SourceText, AcceptanceCriteria: p.AcceptanceCriteria, Tags: p.Tags, EstimatedEffort: p.EstimatedEffort, IsBaseline: false, BaselineVersion: 0, CreatedBy: userID, UpdatedBy: userID, CreatedAt: now, UpdatedAt: now}
	_, err = s.db.Collection("requirements").InsertOne(ctx, req)
	if err == nil {
		activity.Log(ctx, s.db, project.Workspace, userID, "REQUIREMENT_CREATED", "Requirement", req.ID.Hex(), bson.M{"title": req.Title, "projectId": projectID.Hex()})
	}
	return req, err
}

func (s Service) ListByProject(ctx context.Context, projectID, userID primitive.ObjectID) ([]Requirement, error) {
	if _, err := utils.RequireProjectAccess(ctx, s.db, projectID, userID); err != nil {
		return nil, err
	}
	cursor, err := s.db.Collection("requirements").Find(ctx, bson.M{"project": projectID}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	var reqs []Requirement
	err = cursor.All(ctx, &reqs)
	return reqs, err
}

func (s Service) Get(ctx context.Context, id, userID primitive.ObjectID) (Requirement, error) {
	var req Requirement
	err := s.db.Collection("requirements").FindOne(ctx, bson.M{"_id": id}).Decode(&req)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return req, utils.ErrNotFound
	}
	if err != nil {
		return req, err
	}
	_, err = utils.RequireProjectAccess(ctx, s.db, req.Project, userID)
	return req, err
}

func (s Service) Update(ctx context.Context, id, userID primitive.ObjectID, p UpdateRequirementRequest) (Requirement, error) {
	req, err := s.Get(ctx, id, userID)
	if err != nil {
		return req, err
	}
	update := bson.M{"updatedAt": time.Now().UTC(), "updatedBy": userID}
	if p.Title != "" {
		update["title"] = p.Title
	}
	if p.Description != "" {
		update["description"] = p.Description
	}
	if p.Type != "" {
		update["type"] = p.Type
	}
	if p.Priority != "" {
		update["priority"] = p.Priority
	}
	if p.Status != "" {
		update["status"] = p.Status
	}
	if p.Source != "" {
		update["source"] = p.Source
	}
	if p.SourceText != "" {
		update["sourceText"] = p.SourceText
	}
	if p.AcceptanceCriteria != nil {
		update["acceptanceCriteria"] = p.AcceptanceCriteria
	}
	if p.Tags != nil {
		update["tags"] = p.Tags
	}
	if p.EstimatedEffort != nil {
		update["estimatedEffort"] = p.EstimatedEffort
	}
	_, err = s.db.Collection("requirements").UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	if err == nil {
		activity.Log(ctx, s.db, req.Workspace, userID, "REQUIREMENT_UPDATED", "Requirement", id.Hex(), bson.M{"title": req.Title})
	}
	return s.Get(ctx, id, userID)
}

func (s Service) Delete(ctx context.Context, id, userID primitive.ObjectID) error {
	req, err := s.Get(ctx, id, userID)
	if err != nil {
		return err
	}
	_, err = s.db.Collection("requirements").DeleteOne(ctx, bson.M{"_id": id})
	if err == nil {
		activity.Log(ctx, s.db, req.Workspace, userID, "REQUIREMENT_DELETED", "Requirement", id.Hex(), bson.M{"title": req.Title})
	}
	return err
}

func (s Service) Baseline(ctx context.Context, userID primitive.ObjectID, p BaselineRequest) (RequirementVersion, error) {
	projectID, err := utils.ObjectID(p.ProjectID)
	if err != nil {
		return RequirementVersion{}, err
	}
	project, err := utils.RequireProjectAccess(ctx, s.db, projectID, userID)
	if err != nil {
		return RequirementVersion{}, err
	}
	reqs, err := s.ListByProject(ctx, projectID, userID)
	if err != nil {
		return RequirementVersion{}, err
	}
	if len(reqs) == 0 {
		return RequirementVersion{}, errors.New("empty baseline")
	}
	var latest RequirementVersion
	_ = s.db.Collection("requirementversions").FindOne(ctx, bson.M{"project": projectID}, options.FindOne().SetSort(bson.D{{Key: "versionNumber", Value: -1}})).Decode(&latest)
	versionNumber := latest.VersionNumber + 1
	snapshots := make([]RequirementSnapshot, 0, len(reqs))
	for _, req := range reqs {
		snapshots = append(snapshots, RequirementSnapshot{RequirementID: req.ID.Hex(), Title: req.Title, Description: req.Description, Type: req.Type, Priority: req.Priority, Status: req.Status, Source: req.Source, AcceptanceCriteria: req.AcceptanceCriteria, Tags: req.Tags, EstimatedEffort: req.EstimatedEffort})
	}
	if p.Label == "" {
		p.Label = fmt.Sprintf("Baseline v%d", versionNumber)
	}
	if p.Description == "" {
		p.Description = fmt.Sprintf("Requirement baseline version %d", versionNumber)
	}
	version := RequirementVersion{ID: utils.NewID(), Project: projectID, Workspace: project.Workspace, VersionNumber: versionNumber, Label: p.Label, Description: p.Description, RequirementsSnapshot: snapshots, CreatedBy: userID, CreatedAt: time.Now().UTC()}
	_, err = s.db.Collection("requirementversions").InsertOne(ctx, version)
	if err == nil {
		_, _ = s.db.Collection("requirements").UpdateMany(ctx, bson.M{"project": projectID}, bson.M{"$set": bson.M{"isBaseline": true, "baselineVersion": versionNumber, "updatedAt": time.Now().UTC(), "updatedBy": userID}})
		activity.Log(ctx, s.db, project.Workspace, userID, "REQUIREMENT_BASELINE_CREATED", "RequirementVersion", version.ID.Hex(), bson.M{"projectId": projectID.Hex(), "versionNumber": versionNumber})
	}
	return version, err
}

func (s Service) Versions(ctx context.Context, projectID, userID primitive.ObjectID) ([]RequirementVersion, error) {
	if _, err := utils.RequireProjectAccess(ctx, s.db, projectID, userID); err != nil {
		return nil, err
	}
	cursor, err := s.db.Collection("requirementversions").Find(ctx, bson.M{"project": projectID}, options.Find().SetSort(bson.D{{Key: "versionNumber", Value: -1}}))
	if err != nil {
		return nil, err
	}
	var versions []RequirementVersion
	err = cursor.All(ctx, &versions)
	return versions, err
}

func def(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
