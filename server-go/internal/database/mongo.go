package database

import (
	"context"
	"time"

	"driftledger/server-go/internal/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Mongo struct {
	Client *mongo.Client
	DB     *mongo.Database
}

func Connect(cfg config.Config) (*Mongo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}
	db := client.Database(cfg.MongoDatabase)
	if err := ensureIndexes(ctx, db); err != nil {
		return nil, err
	}
	return &Mongo{Client: client, DB: db}, nil
}

func (m *Mongo) Disconnect(ctx context.Context) error {
	return m.Client.Disconnect(ctx)
}

func ensureIndexes(ctx context.Context, db *mongo.Database) error {
	indexes := map[string][]mongo.IndexModel{
		"users": {
			{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
		"workspacemembers": {
			{Keys: bson.D{{Key: "workspace", Value: 1}, {Key: "user", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "user", Value: 1}}},
		},
		"workspaces": {
			{Keys: bson.D{{Key: "owner", Value: 1}}},
			{Keys: bson.D{{Key: "slug", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
		"projects": {
			{Keys: bson.D{{Key: "workspace", Value: 1}}},
			{Keys: bson.D{{Key: "createdBy", Value: 1}}},
		},
		"activitylogs": {
			{Keys: bson.D{{Key: "workspace", Value: 1}, {Key: "createdAt", Value: -1}}},
		},
		"requirements": {
			{Keys: bson.D{{Key: "project", Value: 1}}},
			{Keys: bson.D{{Key: "workspace", Value: 1}}},
		},
		"requirementversions": {
			{Keys: bson.D{{Key: "project", Value: 1}, {Key: "versionNumber", Value: -1}}},
		},
		"driftanalyses": {
			{Keys: bson.D{{Key: "project", Value: 1}, {Key: "createdAt", Value: -1}}},
		},
		"changerequests": {
			{Keys: bson.D{{Key: "project", Value: 1}, {Key: "createdAt", Value: -1}}},
		},
		"files": {
			{Keys: bson.D{{Key: "project", Value: 1}, {Key: "createdAt", Value: -1}}},
		},
	}

	for collection, models := range indexes {
		if _, err := db.Collection(collection).Indexes().CreateMany(ctx, models); err != nil {
			return err
		}
	}
	return nil
}
