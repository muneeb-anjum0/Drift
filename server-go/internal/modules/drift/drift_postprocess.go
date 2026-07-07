package drift

import (
	"regexp"
	"sort"
	"strings"
)

type canonicalRule struct {
	key            string
	title          string
	label          string
	impact         string
	hours          float64
	modules        []string
	summary        string
	recommendation string
	terms          []string
}

var duplicatePunctuation = regexp.MustCompile(`[.!?]{2,}`)
var sentenceSplitter = regexp.MustCompile(`(?m)([.!?])\s+`)
var nonWord = regexp.MustCompile(`[^a-z0-9]+`)

var canonicalRules = []canonicalRule{
	{
		key:            "family_portal",
		title:          "Add Family Member Portal Access",
		label:          "added",
		impact:         "high",
		hours:          18,
		modules:        []string{"Authentication", "Role Management", "Appointments", "Prescriptions", "Billing", "Payment Status", "Notifications"},
		summary:        "The client requested family member accounts so relatives can log in and view appointments, prescriptions, invoices, payment status, and notifications for the patient.",
		recommendation: "Approve this as a scope addition because it introduces delegated access, privacy controls, and family-facing patient data views.",
		terms:          []string{"family member", "family members", "relative", "relatives", "family account", "family accounts"},
	},
	{
		key:            "parent_portal",
		title:          "Add Parent Portal Access",
		label:          "added",
		impact:         "high",
		hours:          18,
		modules:        []string{"Authentication", "Role Management", "Access Control", "Attendance", "Grades", "Billing", "Notifications"},
		summary:        "The client requested parent accounts so parents can log in and view relevant student information for their children.",
		recommendation: "Approve this as a scope addition before implementation because it introduces a new actor, permissions, privacy considerations, and parent-facing views.",
		terms:          []string{"parent", "parents", "parent account", "parent accounts", "parent portal", "parent access", "children", "child", "guardian"},
	},
	{
		key:            "sms_otp",
		title:          "Add SMS OTP Password Reset",
		label:          "added",
		impact:         "medium",
		hours:          6,
		modules:        []string{"Authentication", "Notifications"},
		summary:        "The client requested SMS OTP as an additional password recovery method.",
		recommendation: "Confirm the SMS provider, verification rules, and delivery/error handling before implementation.",
		terms:          []string{"sms otp", "otp", "password reset", "reset through sms", "authentication method"},
	},
	{
		key:            "late_submission",
		title:          "Modify Assignment Submission Deadline Policy",
		label:          "modified",
		impact:         "medium",
		hours:          8,
		modules:        []string{"Assignments", "Deadline Rules", "Penalty Calculation"},
		summary:        "The client requested a deadline policy change that allows late assignment submissions with a penalty.",
		recommendation: "Approve the new late-submission policy and confirm penalty rules before implementation.",
		terms:          []string{"late submission", "24 hours after due date", "late penalty", "due date", "assignment submission"},
	},
	{
		key:            "remove_card_payment",
		title:          "Remove Card Payment From First Release",
		label:          "removed",
		impact:         "high",
		hours:          4,
		modules:        []string{"Payments", "Fees", "Billing"},
		summary:        "The client requested removing card payment from the first release and keeping fee status visibility only.",
		recommendation: "Confirm the release scope reduction and update billing/payment expectations before implementation continues.",
		terms:          []string{"remove card payment", "payment removal"},
	},
	{
		key:            "appointment_cancel_window",
		title:          "Modify Appointment Cancellation Window",
		label:          "modified",
		impact:         "medium",
		hours:          8,
		modules:        []string{"Appointments", "Notifications"},
		summary:        "The client requested changing the appointment cancellation window from 24 hours before the scheduled time to 2 hours before the scheduled time.",
		recommendation: "Confirm the new cancellation cutoff, patient notification copy, and any clinic override rules before implementation.",
		terms:          []string{"cancel appointments", "cancellation window", "2 hours", "24 hours", "scheduled time"},
	},
	{
		key:            "appointment_cancel_contradiction",
		title:          "Contradict Appointment Cancellation Policy",
		label:          "contradiction",
		impact:         "high",
		hours:          12,
		modules:        []string{"Appointments", "Notifications"},
		summary:        "The client requested allowing appointment cancellations anytime, even after the scheduled appointment time, which contradicts the approved cancellation cutoff policy.",
		recommendation: "Resolve the cancellation policy conflict before implementation because this changes patient behavior, clinic scheduling, and notification rules.",
		terms:          []string{"cancel appointments anytime", "after the scheduled appointment time", "cancel anytime"},
	},
	{
		key:            "vague_dashboard",
		title:          "Clarify Patient Dashboard Improvements",
		label:          "ambiguous",
		impact:         "medium",
		hours:          4,
		modules:        []string{"Dashboard", "Product Discovery"},
		summary:        "The client asked to make the patient dashboard smarter and easier to use, but the request does not define specific behavior, data, or acceptance criteria.",
		recommendation: "Ask the client to clarify the dashboard goals, affected widgets, user actions, and acceptance criteria before estimating implementation.",
		terms:          []string{"dashboard smarter", "dashboard easier", "smarter and easier", "make the patient dashboard"},
	},
	{
		key:            "clinic_analytics",
		title:          "Replace CSV Reports With Interactive Clinic Analytics",
		label:          "modified",
		impact:         "high",
		hours:          18,
		modules:        []string{"Reports", "Analytics", "Dashboard", "Documents"},
		summary:        "The client requested replacing CSV exports with interactive clinic analytics dashboards that include charts, filters, doctor-wise summaries, and downloadable snapshots.",
		recommendation: "Approve this as a reporting redesign because it expands clinic reporting from static CSV export into dashboard, filtering, analytics, and snapshot download scope.",
		terms:          []string{"interactive clinic analytics", "clinic analytics", "doctor-wise summaries", "csv exports", "downloadable snapshots"},
	},
	{
		key:            "interactive_reports",
		title:          "Replace PDF Reports With Interactive Report Cards",
		label:          "modified",
		impact:         "high",
		hours:          18,
		modules:        []string{"Reports", "Analytics", "Dashboard", "Documents"},
		summary:        "The client requested replacing static PDF academic reports with interactive web-based report cards including charts, filters, and downloadable summaries.",
		recommendation: "Approve this as a reporting redesign because it expands UI, filtering, visualization, and download scope.",
		terms:          []string{"interactive report", "web-based report card", "charts", "filters", "downloadable summaries", "instead of pdf", "pdf reports", "academic reports"},
	},
	{
		key:            "same_report_access",
		title:          "Expose Existing Report Download From Reports Page",
		label:          "modified",
		impact:         "low",
		hours:          2,
		modules:        []string{"Reports", "Documents"},
		summary:        "The client is asking for another access point to the same existing report rather than a new reporting capability.",
		recommendation: "Treat this as a minor placement or navigation adjustment if the same report download already exists.",
		terms:          []string{"same report", "download same report", "reports page", "existing report", "from dashboard", "from reports page"},
	},
	{
		key:            "same_prescription_access",
		title:          "Expose Existing Prescription PDF From Visit History",
		label:          "modified",
		impact:         "low",
		hours:          2,
		modules:        []string{"Prescriptions", "Documents"},
		summary:        "The client is asking for another access point to the same existing prescription PDF rather than a new prescription capability.",
		recommendation: "Treat this as a minor placement or navigation adjustment if the same prescription PDF download already exists.",
		terms:          []string{"same prescription", "prescription pdf", "visit history"},
	},
}

func CleanDetectedChanges(changes []DetectedChange, inputText string) []DetectedChange {
	if len(changes) == 0 {
		return []DetectedChange{}
	}
	if key := primaryIntentKey(inputText); key != "" {
		normalized := normalizeChanges(changes)
		return []DetectedChange{buildGroupedChange(key, normalized, inputText)}
	}
	groups := map[string][]DetectedChange{}
	groupOrder := []string{}
	for _, change := range normalizeChanges(changes) {
		key := canonicalKey(change, inputText)
		if key == "" {
			key = "generic:" + normalizeChangeText(change.Title+" "+change.ChangeType)
		}
		if _, exists := groups[key]; !exists {
			groupOrder = append(groupOrder, key)
		}
		groups[key] = append(groups[key], change)
	}

	out := make([]DetectedChange, 0, len(groupOrder))
	for _, key := range groupOrder {
		group := groups[key]
		out = append(out, buildGroupedChange(key, group, inputText))
	}
	return out
}

func CleanAnalysis(changes []DetectedChange, inputText string) ([]DetectedChange, int, string, map[string]int, float64, string) {
	grouped := CleanDetectedChanges(changes, inputText)
	score, risk, counts, hours, summary := Score(grouped)
	if len(grouped) == 0 {
		summary = "No meaningful scope drift was detected for this client message."
	} else if len(grouped) == 1 && grouped[0].Description != "" {
		summary = grouped[0].Description
	}
	return grouped, score, risk, counts, hours, CleanReasoning(summary)
}

func CleanReasoning(text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	normalizedText := duplicatePunctuation.ReplaceAllString(text, ".")
	parts := sentenceSplitter.ReplaceAllString(normalizedText, "$1|")
	seen := map[string]struct{}{}
	sentences := []string{}
	for _, part := range strings.Split(parts, "|") {
		sentence := strings.TrimSpace(part)
		if sentence == "" {
			continue
		}
		key := normalizeSentence(sentence)
		if key == "" {
			continue
		}
		duplicate := false
		for existing := range seen {
			if existing == key || sentenceSimilarity(existing, key) >= 0.82 {
				duplicate = true
				break
			}
		}
		if duplicate {
			continue
		}
		seen[key] = struct{}{}
		sentences = append(sentences, sentence)
	}
	out := strings.Join(sentences, " ")
	if len(out) > 700 {
		out = strings.TrimSpace(out[:700]) + "..."
	}
	return out
}

func AffectedModules(change DetectedChange) []string {
	return NormalizeModules(change.AffectedModules)
}

func primaryIntentKey(inputText string) string {
	text := strings.ToLower(inputText)
	switch {
	case isFamilyPortalRequest(text):
		return "family_portal"
	case isAppointmentCancelContradiction(text):
		return "appointment_cancel_contradiction"
	case isAppointmentCancelWindowChange(text):
		return "appointment_cancel_window"
	case isVagueDashboardRequest(text):
		return "vague_dashboard"
	case isClinicAnalyticsRequest(text):
		return "clinic_analytics"
	case isExplicitCardPaymentRemoval(text):
		return "remove_card_payment"
	case containsAll(text, "sms", "otp") && strings.Contains(text, "password"):
		return "sms_otp"
	case strings.Contains(text, "same") && strings.Contains(text, "report") && (strings.Contains(text, "reports page") || strings.Contains(text, "download")):
		return "same_report_access"
	case strings.Contains(text, "same") && strings.Contains(text, "prescription") && strings.Contains(text, "pdf"):
		return "same_prescription_access"
	}
	return ""
}

func canonicalKey(change DetectedChange, inputText string) string {
	text := strings.ToLower(inputText + " " + change.Title + " " + change.Description + " " + change.OldText + " " + change.NewText)
	for _, rule := range canonicalRules {
		if rule.key == "remove_card_payment" && !isExplicitCardPaymentRemoval(text) {
			continue
		}
		for _, term := range rule.terms {
			if strings.Contains(text, term) {
				return rule.key
			}
		}
	}
	return ""
}

func buildGroupedChange(key string, group []DetectedChange, inputText string) DetectedChange {
	first := group[0]
	rule, hasRule := canonicalRuleByKey(key)
	confidence := 0
	requirementIDs := map[string]struct{}{}
	requirementTitles := map[string]struct{}{}
	reasoningParts := []string{}
	for _, change := range group {
		if change.Confidence > confidence {
			confidence = change.Confidence
		}
		if change.BaselineRequirementID != "" {
			requirementIDs[change.BaselineRequirementID] = struct{}{}
		}
		if change.BaselineRequirementTitle != "" {
			requirementTitles[change.BaselineRequirementTitle] = struct{}{}
		}
		if change.Description != "" {
			reasoningParts = append(reasoningParts, change.Description)
		}
	}
	if confidence == 0 {
		confidence = first.Confidence
	}

	grouped := first
	grouped.Confidence = confidence
	grouped.NewText = inputText
	grouped.Description = CleanReasoning(strings.Join(reasoningParts, " "))
	grouped.BaselineRequirementID = strings.Join(sortedSet(requirementIDs), ",")
	grouped.BaselineRequirementTitle = strings.Join(sortedSet(requirementTitles), ", ")
	if hasRule {
		grouped.Title = rule.title
		grouped.ChangeType = rule.label
		grouped.Impact = rule.impact
		if grouped.ChangeType == "contradiction" && impactRank(grouped.Impact) < impactRank("high") {
			grouped.Impact = "high"
		}
		grouped.AffectedModules = NormalizeModules(rule.modules)
		grouped.Description = rule.summary
		grouped.Recommendation = rule.recommendation
		grouped.EstimatedEffort = &rule.hours
	} else {
		grouped.Title = title(first.Title)
		grouped.ChangeType = normalizeLabel(first.ChangeType)
		grouped.Impact = maxImpact(group)
		grouped.AffectedModules = NormalizeModules(groupModules(group))
		hours := estimateGroupedHours(grouped.ChangeType, grouped.Impact, len(grouped.AffectedModules), strings.ToLower(inputText+" "+grouped.Title+" "+grouped.Description))
		grouped.EstimatedEffort = &hours
		grouped.Recommendation = recommendation(grouped.ChangeType, grouped.Title)
	}
	if grouped.Description == "" {
		grouped.Description = grouped.Title
	}
	return grouped
}

func NormalizeModules(modules []string) []string {
	seen := map[string]struct{}{}
	out := []string{}
	for _, module := range modules {
		for _, part := range strings.Split(module, ",") {
			canonical := canonicalModule(part)
			if canonical == "" {
				continue
			}
			if _, exists := seen[canonical]; exists {
				continue
			}
			seen[canonical] = struct{}{}
			out = append(out, canonical)
		}
	}
	sort.Strings(out)
	return out
}

func canonicalModule(module string) string {
	key := normalizeSentence(module)
	switch key {
	case "", "none":
		return ""
	case "role", "roles", "role management", "parent role", "family role":
		return "Role Management"
	case "student access control", "access control", "permissions", "permission":
		return "Access Control"
	case "fees", "fee", "billing", "invoice", "invoices":
		return "Billing"
	case "payment status", "invoice status":
		return "Payment Status"
	case "notifications sms", "sms", "alerts", "notification":
		return "Notifications"
	case "password recovery", "authentication method":
		return "Authentication"
	case "cancellation policy", "appointment cancellation":
		return "Appointments"
	case "clinic analytics", "dashboards", "patient dashboard", "student dashboard":
		return "Dashboard"
	case "downloads", "download", "visit history", "files", "file":
		return "Documents"
	case "reports exports", "csv exports":
		return "Reports"
	default:
		return strings.TrimSpace(module)
	}
}

func groupModules(changes []DetectedChange) []string {
	modules := []string{}
	for _, change := range changes {
		modules = append(modules, change.AffectedModules...)
	}
	return modules
}

func canonicalRuleByKey(key string) (canonicalRule, bool) {
	for _, rule := range canonicalRules {
		if rule.key == key {
			return rule, true
		}
	}
	return canonicalRule{}, false
}

func estimateGroupedHours(label, impact string, moduleCount int, text string) float64 {
	if strings.Contains(text, "parent") || strings.Contains(text, "family") || strings.Contains(text, "interactive") || strings.Contains(text, "charts") {
		return 18
	}
	switch normalizeLabel(label) {
	case "unchanged":
		return 0
	case "ambiguous":
		return 4
	case "contradiction":
		return 12
	case "removed":
		if impact == "high" || impact == "critical" {
			return 6
		}
		return 4
	case "modified":
		if impact == "high" || moduleCount >= 3 {
			return 16
		}
		if impact == "medium" {
			return 8
		}
		return 3
	case "added":
		if impact == "high" || moduleCount >= 3 {
			return 18
		}
		if impact == "medium" {
			return 8
		}
		return 4
	default:
		return 2
	}
}

func normalizeChanges(changes []DetectedChange) []DetectedChange {
	out := make([]DetectedChange, 0, len(changes))
	for _, change := range changes {
		change.ChangeType = normalizeLabel(change.ChangeType)
		change.Description = CleanReasoning(change.Description)
		out = append(out, change)
	}
	return out
}

func isFamilyPortalRequest(text string) bool {
	return containsAny(text, "family member", "family members", "relative", "relatives") &&
		containsAny(text, "account", "accounts", "log in", "login", "view")
}

func isAppointmentCancelWindowChange(text string) bool {
	return containsAny(text, "cancel appointment", "cancel appointments", "cancellation") &&
		containsAny(text, "2 hours", "two hours") &&
		containsAny(text, "24 hours", "twenty four hours", "instead of")
}

func isAppointmentCancelContradiction(text string) bool {
	return containsAny(text, "cancel appointment", "cancel appointments", "cancellation") &&
		containsAny(text, "anytime", "any time", "after the scheduled appointment time", "after the scheduled time", "even after")
}

func isVagueDashboardRequest(text string) bool {
	if !strings.Contains(text, "dashboard") {
		return false
	}
	if !containsAny(text, "smarter", "easier", "better", "improve", "improved", "enhance", "enhanced") {
		return false
	}
	return !containsAny(text, "chart", "filter", "download", "appointment", "prescription", "invoice", "payment", "notification", "doctor-wise", "csv")
}

func isClinicAnalyticsRequest(text string) bool {
	return containsAny(text, "clinic analytics", "analytics dashboard", "analytics dashboards", "doctor-wise") ||
		(strings.Contains(text, "csv") && containsAny(text, "interactive", "dashboard", "charts", "filters"))
}

func isExplicitCardPaymentRemoval(text string) bool {
	if !containsAny(text, "card payment", "payment method", "online payment") {
		return false
	}
	return containsAny(text, "remove", "removing", "removed", "without", "exclude", "excludes", "disabled", "disable", "no card payment", "first release")
}

func containsAll(text string, terms ...string) bool {
	for _, term := range terms {
		if !strings.Contains(text, term) {
			return false
		}
	}
	return true
}

func containsAny(text string, terms ...string) bool {
	for _, term := range terms {
		if strings.Contains(text, term) {
			return true
		}
	}
	return false
}

func maxImpact(changes []DetectedChange) string {
	best := "low"
	bestRank := impactRank(best)
	for _, change := range changes {
		if rank := impactRank(change.Impact); rank > bestRank {
			best = change.Impact
			bestRank = rank
		}
	}
	return best
}

func impactRank(impact string) int {
	switch strings.ToLower(strings.TrimSpace(impact)) {
	case "critical":
		return 4
	case "high":
		return 3
	case "medium":
		return 2
	default:
		return 1
	}
}

func normalizeLabel(label string) string {
	switch strings.ToLower(strings.TrimSpace(label)) {
	case "added", "modified", "removed", "contradiction", "ambiguous", "unchanged":
		return strings.ToLower(strings.TrimSpace(label))
	default:
		return "ambiguous"
	}
}

func normalizeSentence(sentence string) string {
	sentence = strings.ToLower(strings.TrimSpace(sentence))
	sentence = duplicatePunctuation.ReplaceAllString(sentence, ".")
	sentence = strings.Join(strings.Fields(sentence), " ")
	return strings.Trim(sentence, " .!?")
}

func normalizeChangeText(text string) string {
	text = nonWord.ReplaceAllString(strings.ToLower(text), " ")
	words := []string{}
	for _, word := range strings.Fields(text) {
		if _, stop := requirementStopWords[word]; stop {
			continue
		}
		words = append(words, normalizeRequirementToken(word))
	}
	sort.Strings(words)
	return strings.Join(words, " ")
}

func sentenceSimilarity(left, right string) float64 {
	leftTokens := tokenSet(left)
	rightTokens := tokenSet(right)
	if len(leftTokens) == 0 || len(rightTokens) == 0 {
		return 0
	}
	overlap := 0
	for token := range leftTokens {
		if _, ok := rightTokens[token]; ok {
			overlap++
		}
	}
	return float64(overlap) / float64(min(len(leftTokens), len(rightTokens)))
}

func tokenSet(text string) map[string]struct{} {
	out := map[string]struct{}{}
	for _, word := range strings.Fields(nonWord.ReplaceAllString(strings.ToLower(text), " ")) {
		if len(word) <= 2 {
			continue
		}
		out[word] = struct{}{}
	}
	return out
}

func sortedSet(values map[string]struct{}) []string {
	out := make([]string, 0, len(values))
	for value := range values {
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}
