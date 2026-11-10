package utils

import (
	"regexp"
	"strings"
)

var nonSlug = regexp.MustCompile(`[^a-z0-9]+`)

func Slug(value string) string {
	slug := nonSlug.ReplaceAllString(strings.ToLower(strings.TrimSpace(value)), "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		return "workspace"
	}
	return slug
}
