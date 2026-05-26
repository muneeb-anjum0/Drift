package utils

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	ErrNotFound  = errors.New("not found")
	ErrForbidden = errors.New("forbidden")
)

type ProjectAccess struct {
	ID        primitive.ObjectID `bson:"_id"`
	Workspace primitive.ObjectID `bson:"workspace"`
	Name      string             `bson:"name"`
	Client    string             `bson:"clientName"`
}

func Context(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, 8*time.Second)
}

func HasWorkspaceAccess(ctx context.Context, db *mongo.Database, workspaceID, userID primitive.ObjectID) (bool, error) {
	filter := bson.M{"workspace": workspaceID, "user": userID}
	count, err := db.Collection("workspacemembers").CountDocuments(ctx, filter)
	return count > 0, err
}

func RequireWorkspaceAccess(ctx context.Context, db *mongo.Database, workspaceID, userID primitive.ObjectID) error {
	ok, err := HasWorkspaceAccess(ctx, db, workspaceID, userID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrForbidden
	}
	return nil
}

func RequireProjectAccess(ctx context.Context, db *mongo.Database, projectID, userID primitive.ObjectID) (ProjectAccess, error) {
	var project ProjectAccess
	if err := db.Collection("projects").FindOne(ctx, bson.M{"_id": projectID}).Decode(&project); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return project, ErrNotFound
		}
		return project, err
	}
	if err := RequireWorkspaceAccess(ctx, db, project.Workspace, userID); err != nil {
		return project, err
	}
	return project, nil
}
