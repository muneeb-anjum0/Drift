package project

import (
	"context"
	"errors"
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

func (s Service) Create(ctx context.Context, userID primitive.ObjectID, payload CreateProjectRequest) (Project, error) {
	workspaceID, err := utils.ObjectID(payload.WorkspaceID)
	if err != nil {
		return Project{}, err
	}
	if err := utils.RequireWorkspaceAccess(ctx, s.db, workspaceID, userID); err != nil {
		return Project{}, err
	}
	now := time.Now().UTC()
	project := Project{ID: utils.NewID(), Workspace: workspaceID, Name: payload.Name, ClientName: payload.ClientName, Description: payload.Description, Status: def(payload.Status, "planning"), Priority: def(payload.Priority, "medium"), OriginalScope: payload.OriginalScope, Deadline: parseDate(payload.Deadline), CreatedBy: userID, CreatedAt: now, UpdatedAt: now}
	if _, err := s.db.Collection("projects").InsertOne(ctx, project); err != nil {
		return project, err
	}
	activity.Log(ctx, s.db, workspaceID, userID, "PROJECT_CREATED", "Project", project.ID.Hex(), bson.M{"name": project.Name})
	return project, nil
}

func (s Service) List(ctx context.Context, userID primitive.ObjectID, workspaceID *primitive.ObjectID) ([]Project, error) {
	filter := bson.M{}
	if workspaceID != nil {
		if err := utils.RequireWorkspaceAccess(ctx, s.db, *workspaceID, userID); err != nil {
			return nil, err
		}
		filter["workspace"] = *workspaceID
	} else {
		cursor, err := s.db.Collection("workspacemembers").Find(ctx, bson.M{"user": userID})
		if err != nil {
			return nil, err
		}
		var members []struct {
			Workspace primitive.ObjectID `bson:"workspace"`
		}
		_ = cursor.All(ctx, &members)
		ids := make([]primitive.ObjectID, 0, len(members))
		for _, member := range members {
			ids = append(ids, member.Workspace)
		}
		filter["workspace"] = bson.M{"$in": ids}
	}
	cursor, err := s.db.Collection("projects").Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	var projects []Project
	err = cursor.All(ctx, &projects)
	return projects, err
}

func (s Service) Get(ctx context.Context, projectID, userID primitive.ObjectID) (Project, error) {
	access, err := utils.RequireProjectAccess(ctx, s.db, projectID, userID)
	if err != nil {
		return Project{}, err
	}
	var project Project
	err = s.db.Collection("projects").FindOne(ctx, bson.M{"_id": access.ID}).Decode(&project)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return project, utils.ErrNotFound
	}
	return project, err
}

func (s Service) Update(ctx context.Context, projectID, userID primitive.ObjectID, payload UpdateProjectRequest) (Project, error) {
	project, err := s.Get(ctx, projectID, userID)
	if err != nil {
		return project, err
	}
	update := bson.M{"updatedAt": time.Now().UTC()}
	if payload.Name != "" {
		update["name"] = payload.Name
	}
	if payload.ClientName != "" {
		update["clientName"] = payload.ClientName
	}
	if payload.Description != "" {
		update["description"] = payload.Description
	}
	if payload.Status != "" {
		update["status"] = payload.Status
	}
	if payload.Priority != "" {
		update["priority"] = payload.Priority
	}
	if payload.OriginalScope != "" {
		update["originalScope"] = payload.OriginalScope
	}
	if payload.Deadline != "" {
		update["deadline"] = parseDate(payload.Deadline)
	}
	_, err = s.db.Collection("projects").UpdateOne(ctx, bson.M{"_id": projectID}, bson.M{"$set": update})
	if err == nil {
		activity.Log(ctx, s.db, project.Workspace, userID, "PROJECT_UPDATED", "Project", projectID.Hex(), bson.M{
			"name":       def(updateString(update, "name"), project.Name),
			"status":     def(updateString(update, "status"), project.Status),
			"clientName": def(updateString(update, "clientName"), project.ClientName),
		})
	}
	return s.Get(ctx, projectID, userID)
}

func (s Service) Delete(ctx context.Context, projectID, userID primitive.ObjectID) error {
	project, err := s.Get(ctx, projectID, userID)
	if err != nil {
		return err
	}
	_, err = s.db.Collection("projects").DeleteOne(ctx, bson.M{"_id": projectID})
	if err == nil {
		activity.Log(ctx, s.db, project.Workspace, userID, "PROJECT_DELETED", "Project", projectID.Hex(), bson.M{"name": project.Name})
	}
	return err
}

func def(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func updateString(update bson.M, key string) string {
	if value, ok := update[key].(string); ok {
		return value
	}
	return ""
}
func parseDate(value string) *time.Time {
	if value == "" {
		return nil
	}
	if t, err := time.Parse(time.RFC3339, value); err == nil {
		return &t
	}
	if t, err := time.Parse("2006-01-02", value); err == nil {
		return &t
	}
	return nil
}
