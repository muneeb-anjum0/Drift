package workspace

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

func (s Service) Create(ctx context.Context, userID primitive.ObjectID, payload CreateWorkspaceRequest) (Workspace, error) {
	now := time.Now().UTC()
	id := utils.NewID()
	ws := Workspace{ID: id, Name: payload.Name, Slug: fmt.Sprintf("%s-%s", utils.Slug(payload.Name), id.Hex()[18:]), Owner: userID, CreatedBy: userID, Description: payload.Description, CreatedAt: now, UpdatedAt: now}
	if _, err := s.db.Collection("workspaces").InsertOne(ctx, ws); err != nil {
		return ws, err
	}
	member := WorkspaceMember{ID: utils.NewID(), Workspace: id, User: userID, Role: "owner", CreatedAt: now, UpdatedAt: now}
	_, _ = s.db.Collection("workspacemembers").InsertOne(ctx, member)
	activity.Log(ctx, s.db, id, userID, "WORKSPACE_CREATED", "Workspace", id.Hex(), bson.M{"name": ws.Name})
	return ws, nil
}

func (s Service) List(ctx context.Context, userID primitive.ObjectID) ([]Workspace, error) {
	cursor, err := s.db.Collection("workspacemembers").Find(ctx, bson.M{"user": userID})
	if err != nil {
		return nil, err
	}
	var members []WorkspaceMember
	_ = cursor.All(ctx, &members)
	ids := make([]primitive.ObjectID, 0, len(members))
	for _, member := range members {
		ids = append(ids, member.Workspace)
	}
	cursor, err = s.db.Collection("workspaces").Find(ctx, bson.M{"_id": bson.M{"$in": ids}}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	var workspaces []Workspace
	err = cursor.All(ctx, &workspaces)
	return workspaces, err
}

func (s Service) Get(ctx context.Context, workspaceID, userID primitive.ObjectID) (Workspace, error) {
	if err := utils.RequireWorkspaceAccess(ctx, s.db, workspaceID, userID); err != nil {
		return Workspace{}, err
	}
	var ws Workspace
	err := s.db.Collection("workspaces").FindOne(ctx, bson.M{"_id": workspaceID}).Decode(&ws)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return ws, utils.ErrNotFound
	}
	return ws, err
}

func (s Service) Update(ctx context.Context, workspaceID, userID primitive.ObjectID, payload UpdateWorkspaceRequest) (Workspace, error) {
	var member WorkspaceMember
	if err := s.db.Collection("workspacemembers").FindOne(ctx, bson.M{"workspace": workspaceID, "user": userID}).Decode(&member); err != nil {
		return Workspace{}, utils.ErrForbidden
	}
	update := bson.M{"updatedAt": time.Now().UTC()}
	if payload.Name != "" {
		update["name"] = payload.Name
	}
	if payload.Description != "" {
		update["description"] = payload.Description
	}
	_, err := s.db.Collection("workspaces").UpdateOne(ctx, bson.M{"_id": workspaceID}, bson.M{"$set": update})
	if err != nil {
		return Workspace{}, err
	}
	activity.Log(ctx, s.db, workspaceID, userID, "WORKSPACE_UPDATED", "Workspace", workspaceID.Hex(), bson.M{})
	return s.Get(ctx, workspaceID, userID)
}

func (s Service) Delete(ctx context.Context, workspaceID, userID primitive.ObjectID) error {
	var member WorkspaceMember
	if err := s.db.Collection("workspacemembers").FindOne(ctx, bson.M{"workspace": workspaceID, "user": userID, "role": "owner"}).Decode(&member); err != nil {
		return utils.ErrForbidden
	}
	_, err := s.db.Collection("workspaces").DeleteOne(ctx, bson.M{"_id": workspaceID})
	if err == nil {
		activity.Log(ctx, s.db, workspaceID, userID, "WORKSPACE_DELETED", "Workspace", workspaceID.Hex(), bson.M{})
	}
	return err
}
