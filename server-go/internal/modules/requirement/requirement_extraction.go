package requirement

import (
	"strings"

	"driftledger/server-go/internal/utils"
)

var requirementKeywords = []string{"should allow", "must allow", "user can", "users can", "system should", "system must", "admin can", "admins can", "should", "must", "needs to", "allow", "support", "include", "create", "implement"}

func Extract(sourceText, source string) []CreateRequirementRequest {
	if source == "" {
		source = "original_scope"
	}
	suggestions := []CreateRequirementRequest{}
	for _, statement := range utils.SplitStatements(sourceText) {
		if !utils.ContainsAny(statement, requirementKeywords) {
			continue
		}
		title := strings.TrimSpace(statement)
		if len(title) > 90 {
			title = title[:90]
		}
		priority := "medium"
		lower := strings.ToLower(statement)
		if strings.Contains(lower, "must") || strings.Contains(lower, "critical") || strings.Contains(lower, "security") {
			priority = "high"
		}
		reqType := "functional"
		if strings.Contains(lower, "performance") || strings.Contains(lower, "fast") {
			reqType = "performance"
		} else if strings.Contains(lower, "security") || strings.Contains(lower, "permission") {
			reqType = "security"
		} else if strings.Contains(lower, "api") || strings.Contains(lower, "integrate") {
			reqType = "integration"
		}
		hours := 4.0
		suggestions = append(suggestions, CreateRequirementRequest{Title: title, Description: statement, Type: reqType, Priority: priority, Status: "proposed", Source: source, SourceText: statement, AcceptanceCriteria: []string{}, Tags: []string{}, EstimatedEffort: &hours})
	}
	return suggestions
}
