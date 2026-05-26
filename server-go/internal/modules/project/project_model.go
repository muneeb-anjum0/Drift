package project

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Project struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Workspace     primitive.ObjectID `bson:"workspace" json:"workspace"`
	Name          string             `bson:"name" json:"name"`
	ClientName    string             `bson:"clientName" json:"clientName"`
	Description   string             `bson:"description" json:"description"`
	Status        string             `bson:"status" json:"status"`
	Priority      string             `bson:"priority" json:"priority"`
	OriginalScope string             `bson:"originalScope" json:"originalScope"`
	Deadline      *time.Time         `bson:"deadline,omitempty" json:"deadline,omitempty"`
	CreatedBy     primitive.ObjectID `bson:"createdBy" json:"createdBy"`
	CreatedAt     time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updatedAt" json:"updatedAt"`
}
