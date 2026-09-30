package storage

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/utils"
)

var ErrDisabled = errors.New("Firebase Storage is not enabled. Configure Firebase Storage to upload files.")
var ErrInvalidFile = errors.New("invalid file")

type Backend interface {
	Enabled() bool
	UploadFile(context.Context, string, string, *multipart.FileHeader) (string, string, string, string, error)
	DeleteFile(context.Context, string) error
}

type Service struct {
	cfg    config.Config
	client *storage.Client
}

func New(ctx context.Context, cfg config.Config) (Service, error) {
	if !cfg.FirebaseStorageEnabled || cfg.FirebaseStorageBucket == "" {
		return Service{cfg: cfg}, nil
	}
	client, err := storage.NewClient(ctx)
	if err != nil {
		return Service{cfg: cfg}, fmt.Errorf("initialize Firebase Storage client: %w", err)
	}
	return Service{cfg: cfg, client: client}, nil
}

func (s Service) Enabled() bool {
	return s.cfg.FirebaseStorageEnabled && s.client != nil && s.cfg.FirebaseStorageBucket != ""
}

func (s Service) UploadFile(ctx context.Context, workspaceID, projectID string, header *multipart.FileHeader) (string, string, string, string, error) {
	if !s.Enabled() {
		return "", "", "", "", ErrDisabled
	}
	contentType, err := Inspect(header, s.cfg.MaxUploadSizeMB)
	if err != nil {
		return "", "", "", "", err
	}
	file, err := header.Open()
	if err != nil {
		return "", "", "", "", err
	}
	defer file.Close()
	safe := utils.SafeFilename(header.Filename)
	stored := fmt.Sprintf("%d-%s", time.Now().UTC().UnixNano(), safe)
	path := fmt.Sprintf("workspaces/%s/projects/%s/documents/%s", workspaceID, projectID, stored)
	writer := s.client.Bucket(s.cfg.FirebaseStorageBucket).Object(path).NewWriter(ctx)
	writer.ContentType = contentType
	if _, err := io.Copy(writer, file); err != nil {
		_ = writer.Close()
		return "", "", "", "", err
	}
	if err := writer.Close(); err != nil {
		return "", "", "", "", err
	}
	return path, stored, fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.cfg.FirebaseStorageBucket, path), contentType, nil
}

func (s Service) DeleteFile(ctx context.Context, path string) error {
	if !s.Enabled() {
		return nil
	}
	err := s.client.Bucket(s.cfg.FirebaseStorageBucket).Object(path).Delete(ctx)
	if errors.Is(err, storage.ErrObjectNotExist) {
		return nil
	}
	return err
}

func Validate(header *multipart.FileHeader, maxMB int64) error {
	_, err := Inspect(header, maxMB)
	return err
}

func Inspect(header *multipart.FileHeader, maxMB int64) (string, error) {
	if header == nil || header.Size <= 0 {
		return "", fmt.Errorf("%w: file must not be empty", ErrInvalidFile)
	}
	if maxMB <= 0 || header.Size > maxMB*1024*1024 {
		return "", fmt.Errorf("%w: file exceeds maximum size of %dMB", ErrInvalidFile, maxMB)
	}
	if len(header.Filename) > 255 || strings.ContainsRune(header.Filename, '\x00') {
		return "", fmt.Errorf("%w: file name is invalid", ErrInvalidFile)
	}
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(header.Filename), "."))
	allowed := map[string]bool{"pdf": true, "docx": true, "txt": true, "png": true, "jpg": true, "jpeg": true, "webp": true}
	blocked := map[string]bool{"exe": true, "bat": true, "cmd": true, "sh": true, "js": true, "html": true, "php": true, "ps1": true, "scr": true, "msi": true}
	if blocked[ext] || !allowed[ext] {
		return "", fmt.Errorf("%w: file type is not allowed", ErrInvalidFile)
	}
	file, err := header.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()
	buffer := make([]byte, 512)
	read, err := file.Read(buffer)
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}
	contentType := http.DetectContentType(buffer[:read])
	allowedContentTypes := map[string]map[string]bool{
		"pdf":  {"application/pdf": true},
		"txt":  {"text/plain; charset=utf-8": true},
		"png":  {"image/png": true},
		"jpg":  {"image/jpeg": true},
		"jpeg": {"image/jpeg": true},
		"webp": {"image/webp": true},
		"docx": {"application/zip": true},
	}
	if !allowedContentTypes[ext][contentType] {
		return "", fmt.Errorf("%w: file content does not match its extension", ErrInvalidFile)
	}
	if ext == "docx" {
		readerAt, ok := file.(io.ReaderAt)
		if !ok {
			return "", fmt.Errorf("%w: DOCX content cannot be inspected", ErrInvalidFile)
		}
		archive, err := zip.NewReader(readerAt, header.Size)
		if err != nil {
			return "", fmt.Errorf("%w: malformed DOCX archive", ErrInvalidFile)
		}
		required := map[string]bool{"[Content_Types].xml": false, "word/document.xml": false}
		for _, entry := range archive.File {
			if _, exists := required[entry.Name]; exists {
				required[entry.Name] = true
			}
		}
		for _, found := range required {
			if !found {
				return "", fmt.Errorf("%w: DOCX archive is missing required document entries", ErrInvalidFile)
			}
		}
	}
	return contentType, nil
}
