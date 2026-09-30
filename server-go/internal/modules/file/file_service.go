package file

import (
	"context"
	"errors"
	"mime/multipart"
	"time"

	"driftledger/server-go/internal/authorization"
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/modules/activity"
	storageSvc "driftledger/server-go/internal/storage"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service struct {
	db      *mongo.Database
	storage storageSvc.Backend
	cfg     config.Config
}

func NewService(db *mongo.Database, storage storageSvc.Backend, cfg config.Config) Service {
	return Service{db: db, storage: storage, cfg: cfg}
}

func (s Service) MaxUploadBytes() int64 {
	return s.cfg.MaxUploadSizeMB * 1024 * 1024
}

func (s Service) Upload(ctx context.Context, userID, projectID primitive.ObjectID, documentType string, header *multipart.FileHeader) (File, error) {
	project, err := authorization.RequireProjectCapability(ctx, s.db, projectID, userID, authorization.CapabilityWrite)
	if err != nil {
		return File{}, err
	}
	path, stored, url, contentType, err := s.storage.UploadFile(ctx, project.Workspace.Hex(), projectID.Hex(), header)
	if err != nil {
		return File{}, err
	}
	now := time.Now().UTC()
	doc := File{ID: utils.NewID(), Workspace: project.Workspace, Project: projectID, UploadedBy: userID, OriginalName: header.Filename, StoredName: stored, StoragePath: path, MimeType: contentType, Size: header.Size, Bucket: s.cfg.FirebaseStorageBucket, PublicURL: url, DocumentType: def(documentType, "other"), CreatedAt: now, UpdatedAt: now}
	_, err = s.db.Collection("files").InsertOne(ctx, doc)
	if err != nil {
		_ = s.storage.DeleteFile(ctx, path)
		return doc, err
	}
	activity.Log(ctx, s.db, project.Workspace, userID, "FILE_UPLOADED", "File", doc.ID.Hex(), bson.M{"projectId": projectID.Hex(), "originalName": doc.OriginalName})
	return doc, nil
}

func (s Service) List(ctx context.Context, projectID, userID primitive.ObjectID) ([]File, error) {
	if _, err := authorization.RequireProjectAccess(ctx, s.db, projectID, userID); err != nil {
		return nil, err
	}
	cursor, err := s.db.Collection("files").Find(ctx, bson.M{"project": projectID}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	var out []File
	err = cursor.All(ctx, &out)
	return out, err
}
func (s Service) Get(ctx context.Context, id, userID primitive.ObjectID) (File, error) {
	var doc File
	err := s.db.Collection("files").FindOne(ctx, bson.M{"_id": id}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return doc, utils.ErrNotFound
	}
	if err != nil {
		return doc, err
	}
	_, err = authorization.RequireProjectAccess(ctx, s.db, doc.Project, userID)
	return doc, err
}
func (s Service) Delete(ctx context.Context, id, userID primitive.ObjectID) error {
	doc, err := s.Get(ctx, id, userID)
	if err != nil {
		return err
	}
	if _, err := authorization.RequireProjectCapability(ctx, s.db, doc.Project, userID, authorization.CapabilityWrite); err != nil {
		return err
	}
	if err := s.storage.DeleteFile(ctx, doc.StoragePath); err != nil {
		return err
	}
	_, err = s.db.Collection("files").DeleteOne(ctx, bson.M{"_id": id})
	if err == nil {
		activity.Log(ctx, s.db, doc.Workspace, userID, "FILE_DELETED", "File", id.Hex(), bson.M{"originalName": doc.OriginalName})
	}
	return err
}
func def(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
