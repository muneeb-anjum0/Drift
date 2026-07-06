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
	score, risk, counts, hours, summary := Score(changes)
	engine, used, model := "rule_based", false, (*string)(nil)
	if s.inference.Enabled() {
		if len(version.RequirementsSnapshot) == 0 {
			return AnalysisPreview{}, utils.ErrNotFound
		}
		var inferenceSummary string
		changes, inferenceSummary, err = s.analyzeRequirements(ctx, version.RequirementsSnapshot, p.InputText)
		if err != nil {
			return AnalysisPreview{}, err
		}
		score, risk, counts, hours, summary = Score(changes)
		if inferenceSummary != "" {
			summary = inferenceSummary
		}
		engine = "qwen_lora"
	}
	if enhanced, ok := s.ollama.EnhanceSummary(ctx, summary, p.OllamaModel); ok {
		summary = enhanced
		engine, used = "hybrid", true
		m := s.ollama.Model(p.OllamaModel)
		model = &m
	}
	return AnalysisPreview{ProjectID: projectID.Hex(), WorkspaceID: project.Workspace.Hex(), BaselineVersionID: versionID.Hex(), BaselineVersionNumber: version.VersionNumber, InputType: def(p.InputType, "client_message"), InputText: p.InputText, DriftScore: score, RiskLevel: risk, Summary: summary, DetectedChanges: changes, AddedCount: counts["added"], ModifiedCount: counts["modified"], RemovedCount: counts["removed"], AmbiguousCount: counts["ambiguous"], ContradictionCount: counts["contradiction"], EstimatedExtraHours: hours, AnalysisEngine: engine, OllamaUsed: used, OllamaModel: model}, nil
}

func (s Service) AnalyzeDirect(ctx context.Context, p ModelAnalyzeRequest) (ModelPrediction, error) {
	return s.inference.Predict(ctx, p)
}

type requirementPrediction struct {
	requirement requirement.RequirementSnapshot
	text        string
	prediction  ModelPrediction
	relevance   float64
	selected    bool
}

func (s Service) analyzeRequirements(ctx context.Context, snapshot []requirement.RequirementSnapshot, inputText string) ([]DetectedChange, string, error) {
	results := make([]requirementPrediction, 0, len(snapshot))
	for _, req := range snapshot {
		text := singleRequirementText(req)
		if text == "" {
			continue
		}
		prediction, err := s.inference.Predict(ctx, ModelAnalyzeRequest{BaselineRequirement: text, NewClientMessage: inputText})
		if err != nil {
			return nil, "", err
		}
		results = append(results, requirementPrediction{
			requirement: req,
			text:        text,
			prediction:  prediction,
			relevance:   requirementRelevance(text, inputText),
		})
	}
	if len(results) == 0 {
		return nil, "", utils.ErrNotFound
	}

	sort.SliceStable(results, func(i, j int) bool {
		scoreI := results[i].relevance*100 + results[i].prediction.Confidence*100 + float64(labelScore(results[i].prediction.Label))
		scoreJ := results[j].relevance*100 + results[j].prediction.Confidence*100 + float64(labelScore(results[j].prediction.Label))
		return scoreI > scoreJ
	})

	selected := make([]requirementPrediction, 0, len(results))
	for _, result := range results {
		if result.relevance >= 0.15 {
			result.selected = true
			selected = append(selected, result)
		}
	}
	if len(selected) == 0 {
		results[0].selected = true
		selected = append(selected, results[0])
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
		"requirementsAnalyzed", len(results),
		"results", requirementPredictionLog(results, selected),
	)

	if len(changes) > 0 {
		parts := make([]string, 0, len(changes))
		for _, change := range changes {
			if change.Description != "" {
				parts = append(parts, change.Description)
			}
		}
		return changes, strings.Join(parts, " "), nil
	}
	return changes, selected[0].prediction.Reasoning, nil
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

func requirementPredictionLog(results, selected []requirementPrediction) []map[string]any {
	out := make([]map[string]any, 0, len(results))
	for _, result := range results {
		isSelected := false
		for _, item := range selected {
			if item.requirement.RequirementID == result.requirement.RequirementID {
				isSelected = true
				break
			}
		}
		out = append(out, map[string]any{
			"title":      result.requirement.Title,
			"label":      result.prediction.Label,
			"confidence": result.prediction.Confidence,
			"relevance":  result.relevance,
			"selected":   isSelected,
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
	"that": {}, "this": {}, "they": {}, "their": {}, "there": {}, "existing": {}, "page": {}, "users": {}, "user": {},
	"admins": {}, "admin": {}, "can": {}, "let": {},
}

func requirementRelevance(requirementText, inputText string) float64 {
	baselineTokens := requirementTokens(requirementText)
	inputTokens := requirementTokens(inputText)
	if len(baselineTokens) == 0 || len(inputTokens) == 0 {
		return 0
	}
	overlap := 0
	for token := range inputTokens {
		if _, ok := baselineTokens[token]; ok {
			overlap++
		}
	}
	denominator := len(baselineTokens)
	if len(inputTokens) < denominator {
		denominator = len(inputTokens)
	}
	return float64(overlap) / float64(denominator)
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
	analysis := DriftAnalysis{ID: utils.NewID(), Project: projectID, Workspace: project.Workspace, BaselineVersion: versionID, BaselineVersionNumber: version.VersionNumber, InputType: def(p.InputType, "client_message"), InputText: p.InputText, DriftScore: p.DriftScore, RiskLevel: p.RiskLevel, Summary: p.Summary, DetectedChanges: p.DetectedChanges, AddedCount: p.AddedCount, ModifiedCount: p.ModifiedCount, RemovedCount: p.RemovedCount, AmbiguousCount: p.AmbiguousCount, ContradictionCount: p.ContradictionCount, EstimatedExtraHours: p.EstimatedExtraHours, AnalysisEngine: def(p.AnalysisEngine, "rule_based"), OllamaUsed: p.OllamaUsed, OllamaModel: p.OllamaModel, Status: def(p.Status, "saved"), CreatedBy: userID, CreatedAt: now, UpdatedAt: now}
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
