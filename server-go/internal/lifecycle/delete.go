package lifecycle

import (
	"context"

	storageSvc "driftledger/server-go/internal/storage"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var projectCollections = []string{
	"changerequests",
	"driftanalyses",
	"requirementversions",
	"requirements",
	"files",
}

var workspaceCollections = []string{
	"changerequests",
	"driftanalyses",
	"requirementversions",
	"requirements",
	"files",
	"projects",
	"workspacemembers",
	"activitylogs",
}

type storedFile struct {
	StoragePath string `bson:"storagePath"`
}

func DeleteProject(ctx context.Context, db *mongo.Database, storage storageSvc.Backend, projectID primitive.ObjectID) error {
	filter := bson.M{"project": projectID}
	if err := deleteStoredFiles(ctx, db, storage, filter); err != nil {
		return err
	}
	for _, collection := range projectCollections {
		if _, err := db.Collection(collection).DeleteMany(ctx, filter); err != nil {
			return err
		}
	}
	_, err := db.Collection("projects").DeleteOne(ctx, bson.M{"_id": projectID})
	return err
}

func DeleteWorkspace(ctx context.Context, db *mongo.Database, storage storageSvc.Backend, workspaceID primitive.ObjectID) error {
	filter := bson.M{"workspace": workspaceID}
	if err := deleteStoredFiles(ctx, db, storage, filter); err != nil {
		return err
	}
	for _, collection := range workspaceCollections {
		if _, err := db.Collection(collection).DeleteMany(ctx, filter); err != nil {
			return err
		}
	}
	_, err := db.Collection("workspaces").DeleteOne(ctx, bson.M{"_id": workspaceID})
	return err
}

func deleteStoredFiles(ctx context.Context, db *mongo.Database, storage storageSvc.Backend, filter bson.M) error {
	cursor, err := db.Collection("files").Find(ctx, filter)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)
	for cursor.Next(ctx) {
		var file storedFile
		if err := cursor.Decode(&file); err != nil {
			return err
		}
		if file.StoragePath != "" {
			if err := storage.DeleteFile(ctx, file.StoragePath); err != nil {
				return err
			}
		}
	}
	return cursor.Err()
}
