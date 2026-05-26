package activity

import (
	"context"
	"time"

	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func Log(ctx context.Context, db *mongo.Database, workspace, user primitive.ObjectID, action, entityType, entityID string, metadata bson.M) {
	_, _ = db.Collection("activitylogs").InsertOne(ctx, ActivityLog{ID: utils.NewID(), Workspace: workspace, User: user, Action: action, EntityType: entityType, EntityID: entityID, Metadata: metadata, CreatedAt: time.Now().UTC()})
}
