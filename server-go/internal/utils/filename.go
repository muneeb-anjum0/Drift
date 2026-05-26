package utils

import (
	"path/filepath"
	"regexp"
	"strings"
)

var unsafeFilename = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func SafeFilename(name string) string {
	base := filepath.Base(name)
	base = unsafeFilename.ReplaceAllString(base, "-")
	base = strings.Trim(base, ".-")
	if base == "" {
		return "document"
	}
	return base
}
