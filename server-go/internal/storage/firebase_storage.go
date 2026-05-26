package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/utils"
)

var ErrDisabled = errors.New("Firebase Storage is not enabled. Configure Firebase Storage to upload files.")

type Service struct {
	cfg    config.Config
	client *storage.Client
}

func New(ctx context.Context, cfg config.Config) Service {
	if !cfg.FirebaseStorageEnabled || cfg.FirebaseStorageBucket == "" {
		return Service{cfg: cfg}
	}
	client, err := storage.NewClient(ctx)
	if err != nil {
		return Service{cfg: cfg}
	}
	return Service{cfg: cfg, client: client}
}

func (s Service) Enabled() bool {
	return s.cfg.FirebaseStorageEnabled && s.client != nil && s.cfg.FirebaseStorageBucket != ""
}

func (s Service) UploadFile(ctx context.Context, workspaceID, projectID string, header *multipart.FileHeader) (string, string, string, error) {
	if !s.Enabled() {
		return "", "", "", ErrDisabled
	}
	if err := Validate(header, s.cfg.MaxUploadSizeMB); err != nil {
		return "", "", "", err
	}
	file, err := header.Open()
	if err != nil {
		return "", "", "", err
	}
	defer file.Close()
	safe := utils.SafeFilename(header.Filename)
	stored := fmt.Sprintf("%d-%s", time.Now().UTC().UnixNano(), safe)
	path := fmt.Sprintf("workspaces/%s/projects/%s/documents/%s", workspaceID, projectID, stored)
	writer := s.client.Bucket(s.cfg.FirebaseStorageBucket).Object(path).NewWriter(ctx)
	writer.ContentType = header.Header.Get("Content-Type")
	if _, err := io.Copy(writer, file); err != nil {
		_ = writer.Close()
		return "", "", "", err
	}
	if err := writer.Close(); err != nil {
		return "", "", "", err
	}
	return path, stored, fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.cfg.FirebaseStorageBucket, path), nil
}

func (s Service) DeleteFile(ctx context.Context, path string) error {
	if !s.Enabled() {
		return nil
	}
	return s.client.Bucket(s.cfg.FirebaseStorageBucket).Object(path).Delete(ctx)
}

func Validate(header *multipart.FileHeader, maxMB int64) error {
	if header.Size > maxMB*1024*1024 {
		return fmt.Errorf("file exceeds maximum size of %dMB", maxMB)
	}
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(header.Filename), "."))
	allowed := map[string]bool{"pdf": true, "doc": true, "docx": true, "txt": true, "png": true, "jpg": true, "jpeg": true, "webp": true}
	blocked := map[string]bool{"exe": true, "bat": true, "cmd": true, "sh": true, "js": true, "html": true, "php": true, "ps1": true, "scr": true, "msi": true}
	if blocked[ext] || !allowed[ext] {
		return errors.New("file type is not allowed")
	}
	return nil
}
