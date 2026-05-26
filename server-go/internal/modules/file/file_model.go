package file

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type File struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Workspace    primitive.ObjectID `bson:"workspace" json:"workspace"`
	Project      primitive.ObjectID `bson:"project" json:"project"`
	UploadedBy   primitive.ObjectID `bson:"uploadedBy" json:"uploadedBy"`
	OriginalName string             `bson:"originalName" json:"originalName"`
	StoredName   string             `bson:"storedName" json:"storedName"`
	StoragePath  string             `bson:"storagePath" json:"storagePath"`
	MimeType     string             `bson:"mimeType" json:"mimeType"`
	Size         int64              `bson:"size" json:"size"`
	Bucket       string             `bson:"bucket" json:"bucket"`
	PublicURL    string             `bson:"publicUrl,omitempty" json:"publicUrl,omitempty"`
	SignedURL    string             `bson:"signedUrl,omitempty" json:"signedUrl,omitempty"`
	DocumentType string             `bson:"documentType" json:"documentType"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}
