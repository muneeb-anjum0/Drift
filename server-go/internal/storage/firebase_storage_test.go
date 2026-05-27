package storage

import (
	"mime/multipart"
	"testing"
)

func TestValidateAllowsSupportedDocumentTypes(t *testing.T) {
	header := &multipart.FileHeader{Filename: "scope.pdf", Size: 1024}

	if err := Validate(header, 10); err != nil {
		t.Fatalf("expected pdf to be allowed, got %v", err)
	}
}

func TestValidateRejectsDangerousFileTypes(t *testing.T) {
	header := &multipart.FileHeader{Filename: "payload.exe", Size: 1024}

	if err := Validate(header, 10); err == nil {
		t.Fatal("expected exe file to be rejected")
	}
}

func TestValidateRejectsOversizedFiles(t *testing.T) {
	header := &multipart.FileHeader{Filename: "scope.pdf", Size: 11 * 1024 * 1024}

	if err := Validate(header, 10); err == nil {
		t.Fatal("expected oversized file to be rejected")
	}
}
