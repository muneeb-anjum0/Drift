package drift

import (
	"context"
	"errors"
	"log/slog"
	"sort"
	"strings"
	"time"

	"driftledger/server-go/internal/modules/activity"
	"driftledger/server-go/internal/modules/requirement"
	"driftledger/server-go/internal/ollama"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service struct {
	db        *mongo.Database
	ollama    ollama.Service
	inference InferenceClient
}

func NewService(db *mongo.Database, ollama ollama.Service, inference InferenceClient) Service {
	return Service{db: db, ollama: ollama, inference: inference}
}

var addKeys = []string{"should", "must", "needs to", "allow", "support", "include", "add", "create", "implement", "integrate", "generate", "export", "import", "dashboard", "report", "analytics", "notification", "payment", "role", "permission", "login", "signup", "email", "api", "admin", "user"}
var contradictionKeys = []string{"instead of", "no longer", "remove", "replace", "should not", "don't need", "not required", "cancel", "disable"}
var ambiguityKeys = []string{"maybe", "if possible", "something like", "etc", "and more", "make it better", "improve this", "user-friendly", "modern", "fast", "scalable", "simple", "advanced", "premium", "beautiful", "professional", "optimize"}

func (s Service) Analyze(ctx context.Context, userID primitive.ObjectID, p AnalyzeRequest) (AnalysisPreview, error) {
	projectID, err := utils.ObjectID(p.ProjectID)
	if err != nil {
		return AnalysisPreview{}, err
	}
	versionID, err := utils.ObjectID(p.BaselineVersionID)
	if err != nil {
		return AnalysisPreview{}, err
	}
	project, err := utils.RequireProjectAccess(ctx, s.db, projectID, userID)
	if err != nil {
		return AnalysisPreview{}, err
	}
	var version requirement.RequirementVersion
	if err := s.db.Collection("requirementversions").FindOne(ctx, bson.M{"_id": versionID, "project": projectID}).Decode(&version); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return AnalysisPreview{}, utils.ErrNotFound
		}
		return AnalysisPreview{}, err
	}
	changes := detect(version.RequirementsSnapshot, p.InputText)
	changes, score, risk, counts, hours, summary := CleanAnalysis(changes, p.InputText)
	engine, used, model := "rule_based", false, (*string)(nil)
	requirementResults := []RequirementAnalysisResult{}
	if s.inference.Enabled() {
		if len(version.RequirementsSnapshot) == 0 {
			return AnalysisPreview{}, utils.ErrNotFound
		}
		var inferenceSummary string
		changes, inferenceSummary, requirementResults, err = s.analyzeRequirements(ctx, version.RequirementsSnapshot, p.InputText)
		if err != nil {
			return AnalysisPreview{}, err
		}
		changes, score, risk, counts, hours, summary = CleanAnalysis(changes, p.InputText)
		if inferenceSummary != "" && len(changes) == 0 {
			summary = CleanReasoning(summary + " " + inferenceSummary)
		}
		engine = "qwen_lora"
	}
	return AnalysisPreview{ProjectID: projectID.Hex(), WorkspaceID: project.Workspace.Hex(), BaselineVersionID: versionID.Hex(), BaselineVersionNumber: version.VersionNumber, InputType: def(p.InputType, "client_message"), InputText: p.InputText, DriftScore: score, RiskLevel: risk, Summary: summary, DetectedChanges: changes, RequirementResults: requirementResults, AddedCount: counts["added"], ModifiedCount: counts["modified"], RemovedCount: counts["removed"], AmbiguousCount: counts["ambiguous"], ContradictionCount: counts["contradiction"], EstimatedExtraHours: hours, AnalysisEngine: engine, OllamaUsed: used, OllamaModel: model}, nil
}

func (s Service) AnalyzeDirect(ctx context.Context, p ModelAnalyzeRequest) (ModelPrediction, error) {
	return s.inference.Predict(ctx, p)
}

type requirementPrediction struct {
	requirement requirement.RequirementSnapshot
	text        string
	result      RequirementAnalysisResult
	prediction  ModelPrediction
	selected    bool
}

func (s Service) analyzeRequirements(ctx context.Context, snapshot []requirement.RequirementSnapshot, inputText string) ([]DetectedChange, string, []RequirementAnalysisResult, error) {
	results := make([]requirementPrediction, 0, len(snapshot))
	threshold := s.inference.RelevanceThreshold()
	for _, req := range snapshot {
		text := singleRequirementText(req)
		if text == "" {
			continue
		}
		relevance := scoreRequirementRelevance(req, inputText, threshold)
		results = append(results, requirementPrediction{
			requirement: req,
			text:        text,
			result: RequirementAnalysisResult{
				RequirementID: req.RequirementID,
				Title:         req.Title,
				Text:          text,
				Status:        "ignored",
				Selected:      false,
				Relevance:     relevance,
			},
		})
	}
	if len(results) == 0 {
		return nil, "", nil, utils.ErrNotFound
	}

	sort.SliceStable(results, func(i, j int) bool {
		return results[i].result.Relevance.Score > results[j].result.Relevance.Score
	})

	selected := make([]requirementPrediction, 0, len(results))
	for index := range results {
		if !results[index].result.Relevance.IsRelevant {
			continue
		}
		results[index].selected = true
		results[index].result.Selected = true
		results[index].result.Status = "analyzed"
		selected = append(selected, results[index])
		if len(selected) >= s.inference.MaxAnalyzedRequirements() {
			break
		}
	}
	if len(selected) == 0 {
		changes := []DetectedChange{newRequirementChange(inputText)}
		_, _, _, _, summary := Score(changes)
		requirementResults := make([]RequirementAnalysisResult, 0, len(results))
		for _, result := range results {
			requirementResults = append(requirementResults, result.result)
		}
		slog.Info("requirement_level_drift_analysis",
			"requirementsAnalyzed", 0,
			"requirementsIgnored", len(results),
			"results", requirementResults,
		)
		return changes, summary, requirementResults, nil
	}

	for index := range selected {
		prediction, err := s.inference.Predict(ctx, ModelAnalyzeRequest{BaselineRequirement: selected[index].text, NewClientMessage: inputText})
		if err != nil {
			return nil, "", nil, err
		}
		prediction = normalizePredictionForRelevantRequirement(prediction, selected[index].result.Relevance, selected[index].text, inputText)
		selected[index].prediction = prediction
		selected[index].result.Label = strings.ToLower(strings.TrimSpace(prediction.Label))
		selected[index].result.Confidence = prediction.Confidence
		selected[index].result.Reasoning = prediction.Reasoning
		for resultIndex := range results {
			if results[resultIndex].requirement.RequirementID == selected[index].requirement.RequirementID {
				results[resultIndex] = selected[index]
				break
			}
		}
	}

	changes := make([]DetectedChange, 0, len(selected))
	for _, result := range selected {
		if strings.EqualFold(result.prediction.Label, "unchanged") || result.prediction.Confidence < 0.35 {
			continue
		}
		predictedChanges := predictionToChanges(result.prediction, inputText)
		for _, change := range predictedChanges {
			change.BaselineRequirementID = result.requirement.RequirementID
			change.BaselineRequirementTitle = result.requirement.Title
			change.OldText = result.text
			if change.Title == "" {
				change.Title = result.requirement.Title
			}
			changes = append(changes, change)
		}
	}

	slog.Info("requirement_level_drift_analysis",
		"requirementsAnalyzed", len(selected),
		"requirementsIgnored", len(results)-len(selected),
		"results", requirementPredictionLog(results),
	)

	requirementResults := make([]RequirementAnalysisResult, 0, len(results))
	for _, result := range results {
		requirementResults = append(requirementResults, result.result)
	}
	if len(changes) > 0 {
		parts := make([]string, 0, len(changes))
		for _, change := range changes {
			if change.Description != "" {
				parts = append(parts, change.Description)
			}
		}
		return changes, strings.Join(parts, " "), requirementResults, nil
	}
	return changes, selected[0].prediction.Reasoning, requirementResults, nil
}

func normalizePredictionForRelevantRequirement(prediction ModelPrediction, relevance RelevanceResult, requirementText, inputText string) ModelPrediction {
	label := strings.ToLower(strings.TrimSpace(prediction.Label))
	if label != "added" && label != "modified" {
		return prediction
	}
	if !containsString(relevance.MatchedDomains, "reports_exports") {
		return prediction
	}
	lowerInput := strings.ToLower(inputText)
	lowerRequirement := strings.ToLower(requirementText)
	sameExistingAccess := strings.Contains(lowerInput, "same") || strings.Contains(lowerInput, "existing")
	reportAccess := strings.Contains(lowerInput, "download") || strings.Contains(lowerInput, "export")
	requirementAlreadyReports := strings.Contains(lowerRequirement, "report") && (strings.Contains(lowerRequirement, "export") || strings.Contains(lowerRequirement, "csv") || strings.Contains(lowerRequirement, "pdf"))
	if sameExistingAccess && reportAccess && requirementAlreadyReports {
		prediction.Label = "unchanged"
		prediction.Confidence = maxFloat(prediction.Confidence, 0.9)
		if prediction.Reasoning == "" || label == "added" {
			prediction.Reasoning = "The client is asking for another access path to the same existing report, not a new report type or requirement."
		}
		prediction.ChangedElements = []string{}
	}
	return prediction
}

func singleRequirementText(req requirement.RequirementSnapshot) string {
	if text := strings.TrimSpace(req.Description); text != "" {
		return text
	}
	return strings.TrimSpace(req.Title)
}

func baselineRequirementText(snapshot []requirement.RequirementSnapshot) string {
	parts := make([]string, 0, len(snapshot))
	for _, req := range snapshot {
		text := strings.TrimSpace(req.Title + ": " + req.Description)
		if text != ":" && text != "" {
			parts = append(parts, text)
		}
	}
	return strings.Join(parts, "\n")
}

func requirementPredictionLog(results []requirementPrediction) []map[string]any {
	out := make([]map[string]any, 0, len(results))
	for _, result := range results {
		out = append(out, map[string]any{
			"title":          result.requirement.Title,
			"status":         result.result.Status,
			"label":          result.result.Label,
			"confidence":     result.result.Confidence,
			"relevanceScore": result.result.Relevance.Score,
			"matchedTerms":   result.result.Relevance.MatchedTerms,
			"matchedDomains": result.result.Relevance.MatchedDomains,
			"selected":       result.result.Selected,
		})
	}
	return out
}

func labelScore(label string) int {
	switch strings.ToLower(strings.TrimSpace(label)) {
	case "contradiction":
		return 75
	case "removed":
		return 55
	case "modified":
		return 45
	case "added":
		return 35
	case "ambiguous":
		return 25
	default:
		return 0
	}
}

var requirementStopWords = map[string]struct{}{
	"the": {}, "system": {}, "shall": {}, "should": {}, "allow": {}, "also": {}, "same": {}, "from": {}, "with": {},
	"that": {}, "this": {}, "they": {}, "their": {}, "there": {}, "existing": {}, "users": {}, "user": {},
	"admins": {}, "admin": {}, "can": {}, "let": {}, "feature": {}, "add": {}, "make": {}, "better": {},
	"please": {}, "need": {}, "needs": {}, "able": {}, "through": {}, "all": {},
}

var requirementSynonyms = map[string][]string{
	"download":      {"export"},
	"exports":       {"export"},
	"reports":       {"report"},
	"analytics":     {"report", "data"},
	"otp":           {"authentication", "password"},
	"2fa":           {"authentication"},
	"mfa":           {"authentication"},
	"signin":        {"login", "authentication"},
	"alerts":        {"notification"},
	"notify":        {"notification"},
	"notifications": {"notification"},
	"fees":          {"fee", "payment", "billing"},
	"children":      {"student"},
	"parents":       {"parent", "account", "role"},
	"guardians":     {"parent", "account", "role"},
	"invoices":      {"invoice"},
	"billing":       {"invoice", "payment"},
	"usage":         {"report"},
}

var domainKeywords = map[string][]string{
	"authentication":   {"password", "reset", "login", "signin", "auth", "authentication", "otp", "2fa", "mfa", "email", "account", "credentials"},
	"reports_exports":  {"report", "monthly", "weekly", "csv", "pdf", "export", "download", "dashboard", "data", "analytics", "usage"},
	"billing":          {"invoice", "billing", "payment", "subscription", "plan", "refund", "tax", "receipt", "pdf", "fee", "fees"},
	"notifications":    {"notify", "notification", "alert", "reminder", "expiry", "expire", "expired", "subscription"},
	"student_records":  {"student", "attendance", "grade", "grades", "assessment", "course", "children", "parent", "guardian"},
	"admin_access":     {"admin", "staff", "role", "permission", "access", "verification", "verified", "dashboard"},
	"documents":        {"document", "file", "upload", "attachment", "notes", "brief", "scope"},
	"products_content": {"product", "listing", "blog", "post", "homepage", "content", "image"},
}

func scoreRequirementRelevance(req requirement.RequirementSnapshot, inputText string, threshold float64) RelevanceResult {
	titleTokens := requirementTokens(req.Title)
	baselineTokens := requirementTokens(req.Title + " " + req.Description)
	inputTokens := requirementTokens(inputText)
	matchedTerms := intersection(inputTokens, baselineTokens)
	matchedTitleTerms := intersection(inputTokens, titleTokens)
	baselineDomains := matchedDomainSet(baselineTokens)
	inputDomains := matchedDomainSet(inputTokens)
	matchedDomains := intersection(inputDomains, baselineDomains)

	directScore := overlapScore(matchedTerms, baselineTokens, inputTokens)
	titleScore := overlapScore(matchedTitleTerms, titleTokens, inputTokens)
	domainScore := 0.0
	if len(matchedDomains) > 0 {
		domainScore = float64(len(matchedDomains)) / float64(min(len(inputDomains), len(baselineDomains)))
	}
	score := directScore*0.55 + titleScore*0.25 + domainScore*0.35
	if len(matchedTerms) >= 2 && score < 0.45 {
		score += 0.12
	}
	if score > 1 {
		score = 1
	}

	hasSpecificMatch := len(matchedTerms) >= 2 || titleScore >= 0.5
	relevant := score >= threshold && hasSpecificMatch
	reason := "Low relevance to the client message"
	if relevant {
		reason = "Relevant domain or requirement terms matched the client message"
	}
	return RelevanceResult{
		Score:          score,
		MatchedTerms:   sortedKeys(matchedTerms),
		MatchedDomains: sortedKeys(matchedDomains),
		IsRelevant:     relevant,
		Reason:         reason,
	}
}

func requirementTokens(text string) map[string]struct{} {
	cleaned := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			return r
		}
		return ' '
	}, strings.ToLower(text))
	tokens := map[string]struct{}{}
	for _, token := range strings.Fields(cleaned) {
		token = normalizeRequirementToken(token)
		if len(token) <= 2 {
			continue
		}
		if _, stop := requirementStopWords[token]; stop {
			continue
		}
		tokens[token] = struct{}{}
		for _, synonym := range requirementSynonyms[token] {
			tokens[synonym] = struct{}{}
		}
	}
	return tokens
}

func normalizeRequirementToken(token string) string {
	if strings.HasSuffix(token, "ies") && len(token) > 4 {
		return strings.TrimSuffix(token, "ies") + "y"
	}
	if strings.HasSuffix(token, "s") && len(token) > 4 {
		return strings.TrimSuffix(token, "s")
	}
	return token
}

func matchedDomainSet(tokens map[string]struct{}) map[string]struct{} {
	out := map[string]struct{}{}
	for domain, keywords := range domainKeywords {
		for _, keyword := range keywords {
			normalized := normalizeRequirementToken(keyword)
			if _, ok := tokens[normalized]; ok {
				out[domain] = struct{}{}
				break
			}
		}
	}
	return out
}

func intersection(left, right map[string]struct{}) map[string]struct{} {
	out := map[string]struct{}{}
	for token := range left {
		if _, ok := right[token]; ok {
			out[token] = struct{}{}
		}
	}
	return out
}

func overlapScore(overlap, left, right map[string]struct{}) float64 {
	denominator := min(len(left), len(right))
	if denominator == 0 {
		return 0
	}
	return float64(len(overlap)) / float64(denominator)
}

func sortedKeys(values map[string]struct{}) []string {
	out := make([]string, 0, len(values))
	for value := range values {
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func newRequirementChange(inputText string) DetectedChange {
	effort := 2.0
	return DetectedChange{
		ChangeType:      "added",
		Title:           title(inputText),
		Description:     "No relevant baseline requirement matched this client message, so it is treated as a possible new requirement.",
		NewText:         inputText,
		Impact:          "low",
		EstimatedEffort: &effort,
		Confidence:      70,
		Recommendation:  "Confirm whether this should be added as a new baseline requirement before implementation.",
	}
}

func detect(baseline []requirement.RequirementSnapshot, text string) []DetectedChange {
	changes := []DetectedChange{}
	for _, sentence := range utils.SplitStatements(text) {
		lower := strings.ToLower(sentence)
		isAmbiguous := utils.ContainsAny(lower, ambiguityKeys)
		isRemoval := utils.ContainsAny(lower, contradictionKeys)
		isReq := utils.ContainsAny(lower, addKeys)
		if !isAmbiguous && !isRemoval && !isReq {
			continue
		}
		isExplicitRemove := strings.Contains(lower, "remove") || strings.Contains(lower, "no longer") || strings.Contains(lower, "cancel") || strings.Contains(lower, "disable") || strings.Contains(lower, "not required") || strings.Contains(lower, "don't need")
		bestScore := 0.0
		best := requirement.RequirementSnapshot{}
		for _, req := range baseline {
			if score := utils.Similarity(req.Title+" "+req.Description, sentence); score > bestScore {
				bestScore = score
				best = req
			}
		}
		changeType := "added"
		if isAmbiguous {
			changeType = "ambiguous"
		} else if isRemoval {
			if isExplicitRemove {
				changeType = "removed"
			} else {
				changeType = "contradiction"
			}
		} else if bestScore >= .4 {
			changeType = "modified"
		}
		impact := impact(changeType, lower)
		effort := effort(impact)
		change := DetectedChange{ChangeType: changeType, Title: title(sentence), Description: sentence, NewText: sentence, Impact: impact, EstimatedEffort: &effort, Confidence: 72, Recommendation: recommendation(changeType, title(sentence))}
		if bestScore >= .35 {
			change.BaselineRequirementID = best.RequirementID
			change.BaselineRequirementTitle = best.Title
			change.OldText = best.Description
			change.Confidence = int(bestScore * 100)
		}
		changes = append(changes, change)
	}
	return changes
}

func (s Service) Save(ctx context.Context, userID primitive.ObjectID, p SaveRequest) (DriftAnalysis, error) {
	projectID, err := utils.ObjectID(p.ProjectID)
	if err != nil {
		return DriftAnalysis{}, err
	}
	versionID, err := utils.ObjectID(p.BaselineVersionID)
	if err != nil {
		return DriftAnalysis{}, err
	}
	project, err := utils.RequireProjectAccess(ctx, s.db, projectID, userID)
	if err != nil {
		return DriftAnalysis{}, err
	}
	var version requirement.RequirementVersion
	if err := s.db.Collection("requirementversions").FindOne(ctx, bson.M{"_id": versionID, "project": projectID}).Decode(&version); err != nil {
		return DriftAnalysis{}, utils.ErrNotFound
	}
	now := time.Now().UTC()
	changes, score, risk, counts, hours, summary := CleanAnalysis(p.DetectedChanges, p.InputText)
	analysis := DriftAnalysis{ID: utils.NewID(), Project: projectID, Workspace: project.Workspace, BaselineVersion: versionID, BaselineVersionNumber: version.VersionNumber, InputType: def(p.InputType, "client_message"), InputText: p.InputText, DriftScore: score, RiskLevel: risk, Summary: summary, DetectedChanges: changes, RequirementResults: p.RequirementResults, AddedCount: counts["added"], ModifiedCount: counts["modified"], RemovedCount: counts["removed"], AmbiguousCount: counts["ambiguous"], ContradictionCount: counts["contradiction"], EstimatedExtraHours: hours, AnalysisEngine: def(p.AnalysisEngine, "qwen_lora"), OllamaUsed: p.OllamaUsed, OllamaModel: p.OllamaModel, Status: def(p.Status, "saved"), CreatedBy: userID, CreatedAt: now, UpdatedAt: now}
	_, err = s.db.Collection("driftanalyses").InsertOne(ctx, analysis)
	if err == nil {
		activity.Log(ctx, s.db, project.Workspace, userID, "DRIFT_ANALYSIS_CREATED", "DriftAnalysis", analysis.ID.Hex(), bson.M{"projectId": projectID.Hex(), "driftScore": p.DriftScore})
	}
	return analysis, err
}

func (s Service) Get(ctx context.Context, id, userID primitive.ObjectID) (DriftAnalysis, error) {
	var a DriftAnalysis
	err := s.db.Collection("driftanalyses").FindOne(ctx, bson.M{"_id": id}).Decode(&a)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return a, utils.ErrNotFound
	}
	if err != nil {
		return a, err
	}
	_, err = utils.RequireProjectAccess(ctx, s.db, a.Project, userID)
	return a, err
}
func (s Service) List(ctx context.Context, projectID, userID primitive.ObjectID) ([]DriftAnalysis, error) {
	if _, err := utils.RequireProjectAccess(ctx, s.db, projectID, userID); err != nil {
		return nil, err
	}
	cursor, err := s.db.Collection("driftanalyses").Find(ctx, bson.M{"project": projectID}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	var out []DriftAnalysis
	err = cursor.All(ctx, &out)
	return out, err
}
func (s Service) Delete(ctx context.Context, id, userID primitive.ObjectID) error {
	a, err := s.Get(ctx, id, userID)
	if err != nil {
		return err
	}
	_, err = s.db.Collection("driftanalyses").DeleteOne(ctx, bson.M{"_id": id})
	if err == nil {
		activity.Log(ctx, s.db, a.Workspace, userID, "DRIFT_ANALYSIS_DELETED", "DriftAnalysis", id.Hex(), bson.M{})
	}
	return err
}

func impact(changeType, text string) string {
	if strings.Contains(text, "payment") || strings.Contains(text, "security") || strings.Contains(text, "permission") || strings.Contains(text, "login") {
		return "critical"
	}
	if changeType == "removed" || changeType == "contradiction" || strings.Contains(text, "dashboard") || strings.Contains(text, "analytics") || strings.Contains(text, "integration") {
		return "high"
	}
	if changeType == "ambiguous" {
		return "medium"
	}
	return "low"
}
func effort(impact string) float64 {
	if impact == "critical" {
		return 12
	}
	if impact == "high" {
		return 8
	}
	if impact == "medium" {
		return 4
	}
	return 2
}
func title(text string) string {
	text = strings.TrimSpace(text)
	if len(text) > 80 {
		return text[:80]
	}
	return text
}
func recommendation(t, title string) string {
	if t == "added" {
		return "Confirm whether \"" + title + "\" should be added to the approved baseline and update the estimate."
	}
	if t == "removed" {
		return "Confirm removal before implementation changes."
	}
	if t == "contradiction" {
		return "Resolve this contradiction before work continues."
	}
	if t == "ambiguous" {
		return "Clarify this request before adding it to scope."
	}
	return "Review the updated scope and decide whether the baseline needs revision."
}
func def(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
