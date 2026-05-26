package utils

import (
	"regexp"
	"strings"
)

var punctuation = regexp.MustCompile(`[^a-z0-9\s]+`)

func SplitStatements(text string) []string {
	text = strings.ReplaceAll(text, "\r", "\n")
	parts := regexp.MustCompile(`[.!?]\s+|\n+|;+`).Split(text, -1)
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func ContainsAny(text string, keywords []string) bool {
	lower := strings.ToLower(text)
	for _, keyword := range keywords {
		if strings.Contains(lower, keyword) {
			return true
		}
	}
	return false
}

func Tokens(text string) []string {
	stop := map[string]bool{"a": true, "an": true, "and": true, "are": true, "as": true, "at": true, "be": true, "by": true, "for": true, "from": true, "has": true, "have": true, "in": true, "is": true, "it": true, "of": true, "on": true, "or": true, "that": true, "the": true, "to": true, "was": true, "were": true, "will": true, "with": true, "this": true}
	clean := punctuation.ReplaceAllString(strings.ToLower(text), " ")
	raw := strings.Fields(clean)
	out := make([]string, 0, len(raw))
	for _, token := range raw {
		if !stop[token] {
			out = append(out, token)
		}
	}
	return out
}

func Similarity(left, right string) float64 {
	leftTokens := Tokens(left)
	rightTokens := Tokens(right)
	if len(leftTokens) == 0 || len(rightTokens) == 0 {
		return 0
	}
	set := map[string]bool{}
	for _, token := range leftTokens {
		set[token] = true
	}
	overlap := 0
	for _, token := range rightTokens {
		if set[token] {
			overlap++
		}
	}
	denominator := len(leftTokens)
	if len(rightTokens) > denominator {
		denominator = len(rightTokens)
	}
	return float64(overlap) / float64(denominator)
}
