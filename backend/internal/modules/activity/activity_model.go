package activity

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ActivityLog struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Workspace  primitive.ObjectID `bson:"workspace" json:"workspace"`
	User       primitive.ObjectID `bson:"user" json:"user"`
	Action     string             `bson:"action" json:"action"`
	EntityType string             `bson:"entityType" json:"entityType"`
	EntityID   string             `bson:"entityId" json:"entityId"`
	Metadata   bson.M             `bson:"metadata" json:"metadata"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}
