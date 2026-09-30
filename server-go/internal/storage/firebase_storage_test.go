package storage

import (
	"bytes"
	"mime/multipart"
	"testing"
)

func TestValidateAllowsSupportedDocumentTypes(t *testing.T) {
	header := testFileHeader(t, "scope.pdf", []byte("%PDF-1.7\nexample"))

	if err := Validate(header, 10); err != nil {
		t.Fatalf("expected pdf to be allowed, got %v", err)
	}
}

func TestValidateRejectsSpoofedExtension(t *testing.T) {
	header := testFileHeader(t, "scope.pdf", []byte("MZ executable content"))
	if err := Validate(header, 10); err == nil {
		t.Fatal("expected content that does not match the extension to be rejected")
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

func testFileHeader(t *testing.T, filename string, content []byte) *multipart.FileHeader {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		t.Fatalf("create multipart file: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("write multipart file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}
	form, err := multipart.NewReader(&body, writer.Boundary()).ReadForm(int64(body.Len()) + 1024)
	if err != nil {
		t.Fatalf("read multipart form: %v", err)
	}
	t.Cleanup(func() { _ = form.RemoveAll() })
	return form.File["file"][0]
}
