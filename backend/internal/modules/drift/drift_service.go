package drift

import (
	"context"
	"errors"
	"log/slog"
	"sort"
	"strings"

	"driftledger/backend/internal/authorization"
	"driftledger/backend/internal/modules/activity"
	"driftledger/backend/internal/modules/provider"
	"driftledger/backend/internal/modules/requirement"
	"driftledger/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service struct {
	db        *mongo.Database
	inference AnalysisProvider
	providers ProviderResolver
}

type ProviderResolver interface {
	Resolve(context.Context, primitive.ObjectID) (provider.Connection, error)
}

type AnalysisProvider interface {
	Enabled() bool
	Health(context.Context) error
	Predict(context.Context, ModelAnalyzeRequest) (ModelPrediction, error)
	RelevanceThreshold() float64
	MaxAnalyzedRequirements() int
	ProviderName() string
	ModelName() string
}

func NewService(db *mongo.Database, inference AnalysisProvider) Service {
	return Service{db: db, inference: inference}
}

func NewServiceWithProviders(db *mongo.Database, local AnalysisProvider, manager ProviderResolver) Service {
	return Service{db: db, inference: local, providers: manager}
}

func (s Service) forWorkspace(ctx context.Context, workspace primitive.ObjectID) (AnalysisProvider, error) {
	if s.providers == nil {
		return s.inference, nil
	}
	selected, err := s.providers.Resolve(ctx, workspace)
	if err != nil {
		return nil, err
	}
	if selected.ProviderType == provider.TypeLocal {
		return s.inference, nil
	}
	external, err := provider.NewClient(selected.Endpoint, selected.Model, selected.APIKey, s.inference.RelevanceThreshold(), s.inference.MaxAnalyzedRequirements())
	if err != nil {
		return nil, err
	}
	return external, nil
}

var addKeys = []string{"should", "must", "needs to", "allow", "support", "include", "add", "create", "implement", "integrate", "generate", "export", "import", "dashboard", "report", "analytics", "notification", "payment", "role", "permission", "login", "signup", "email", "api", "admin", "user"}
var contradictionKeys = []string{"instead of", "no longer", "remove", "replace", "should not", "don't need", "not required", "cancel", "disable"}
var ambiguityKeys = []string{"maybe", "if possible", "something like", "etc", "and more", "make it better", "improve this", "user-friendly", "modern", "fast", "scalable", "simple", "advanced", "premium", "beautiful", "professional", "optimize"}

func (s Service) Analyze(ctx context.Context, userID primitive.ObjectID, p AnalyzeRequest) (AnalysisPreview, error) {
	return s.analyzeWithProgress(ctx, userID, p, nil, nil, nil, nil)
}

func (s Service) analyzeWithProgress(ctx context.Context, userID primitive.ObjectID, p AnalyzeRequest, completed []ScopePairAssessment, summaries []string, onBatch func([]ScopePairAssessment, []string) error, pinned AnalysisProvider) (AnalysisPreview, error) {
	projectID, err := utils.ObjectID(p.ProjectID)
	if err != nil {
		return AnalysisPreview{}, err
	}
	versionID, err := utils.ObjectID(p.BaselineVersionID)
	if err != nil {
		return AnalysisPreview{}, err
	}
	project, err := authorization.RequireProjectCapability(ctx, s.db, projectID, userID, authorization.CapabilityWrite)
	if err != nil {
		return AnalysisPreview{}, err
	}
	var version requirement.RequirementVersion
	if err := s.db.Collection("requirementversions").FindOne(ctx, bson.M{"_id": versionID, "project": projectID, "workspace": project.Workspace}).Decode(&version); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return AnalysisPreview{}, utils.ErrNotFound
		}
		return AnalysisPreview{}, err
	}
	selected := pinned
	if selected == nil {
		selected, err = s.forWorkspace(ctx, project.Workspace)
		if err != nil {
			return AnalysisPreview{}, err
		}
	}
	if !selected.Enabled() {
		return AnalysisPreview{}, ErrInferenceUnavailable
	}
	if len(version.RequirementsSnapshot) == 0 {
		return AnalysisPreview{}, utils.ErrNotFound
	}
	if project.CurrentScopeVersion != nil && *project.CurrentScopeVersion != versionID {
		return AnalysisPreview{}, ErrScopeRevisionStale
	}
	var original requirement.RequirementVersion
	if err := s.db.Collection("requirementversions").FindOne(ctx, bson.M{"project": projectID, "workspace": project.Workspace}, options.FindOne().SetSort(bson.D{{Key: "versionNumber", Value: 1}})).Decode(&original); err != nil {
		return AnalysisPreview{}, err
	}
	assessment, err := assessFullScopeFrom(ctx, selected, original.RequirementsSnapshot, version.RequirementsSnapshot, p.InputText, completed, summaries, onBatch)
	if err != nil {
		return AnalysisPreview{}, err
	}
	if err := ctx.Err(); err != nil {
		return AnalysisPreview{}, err
	}
	if onBatch != nil {
		if err := onBatch(nil, nil); err != nil {
			return AnalysisPreview{}, err
		}
	}
	changes := make([]DetectedChange, 0, len(assessment.Changes))
	counts := map[string]int{"added": 0, "modified": 0, "removed": 0, "contradiction": 0, "ambiguous": 0}
	byID := make(map[string]requirement.RequirementSnapshot, len(version.RequirementsSnapshot))
	for _, item := range version.RequirementsSnapshot {
		byID[item.RequirementID] = item
	}
	for _, proposed := range assessment.Changes {
		change := DetectedChange{ChangeType: proposed.ChangeType, Title: proposed.Title, Description: proposed.Explanation, NewText: p.InputText, ProposedText: proposed.ProposedText, BaselineRequirementID: proposed.RequirementID, Recommendation: "Review the AI assessment and original wording before a decision.", Impact: proposed.Impact, ReviewRequired: assessment.NeedsReview || proposed.ChangeType == "ambiguous"}
		if item, ok := byID[proposed.RequirementID]; ok {
			change.BaselineRequirementTitle = item.Title
			change.OldText = singleRequirementText(item)
		}
		changes = append(changes, change)
		counts[proposed.ChangeType]++
	}
	var hours float64
	if assessment.Effort.Status == "estimated" {
		hours = (*assessment.Effort.MinimumHours + *assessment.Effort.MaximumHours) / 2
	}
	engine := "local_model"
	if selected.ProviderName() == provider.TypeExternal {
		engine = provider.TypeExternal
	}
	preview := AnalysisPreview{ProjectID: projectID.Hex(), WorkspaceID: project.Workspace.Hex(), BaselineVersionID: versionID.Hex(), BaselineVersionNumber: version.VersionNumber, InputType: def(p.InputType, "client_message"), InputText: p.InputText, DriftScore: int(*assessment.MarginalDriftScore), CumulativeDriftScore: *assessment.CumulativeDriftScore, NeedsReview: assessment.NeedsReview, ReviewReason: assessment.ReviewReason, Effort: &assessment.Effort, ScopePairs: assessment.Pairs, RiskLevel: assessment.RiskLevel, Summary: assessment.ScoreExplanation, DetectedChanges: changes, AddedCount: counts["added"], ModifiedCount: counts["modified"], RemovedCount: counts["removed"], AmbiguousCount: counts["ambiguous"], ContradictionCount: counts["contradiction"], EstimatedExtraHours: hours, AnalysisEngine: engine, ModelName: selected.ModelName(), ScopeSchemaVersion: "scope-assessment-v1", ScopePromptVersion: "scope-pipeline-v1"}
	if err := s.storePreview(ctx, userID, projectID, project.Workspace, versionID, &preview); err != nil {
		return AnalysisPreview{}, err
	}
	return preview, nil
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

func (s Service) analyzeRequirements(ctx context.Context, selectedProvider AnalysisProvider, snapshot []requirement.RequirementSnapshot, inputText string) ([]DetectedChange, string, []RequirementAnalysisResult, bool, error) {
	statements := utils.SplitStatements(inputText)
	if len(statements) == 0 {
		return nil, "", nil, false, ErrInferenceBadResponse
	}
	if len(statements) > 5 {
		return nil, "", nil, false, ErrTooManyClientRequests
	}
	allChanges := make([]DetectedChange, 0, len(statements))
	allResults := make([]RequirementAnalysisResult, 0, len(snapshot)*len(statements))
	called := false
	for _, statement := range statements {
		changes, results, didCall, err := s.analyzeOneRequest(ctx, selectedProvider, snapshot, statement)
		if err != nil {
			return nil, "", nil, false, err
		}
		allChanges = append(allChanges, changes...)
		allResults = append(allResults, results...)
		called = called || didCall
	}
	return allChanges, "", allResults, called, nil
}

// analyzeOneRequest checks every requirement in the frozen snapshot. Retrieval
// orders the calls and supplies evidence; it no longer defines the search
// boundary. A new capability is proposed only after the complete pass.
func (s Service) analyzeOneRequest(ctx context.Context, selectedProvider AnalysisProvider, snapshot []requirement.RequirementSnapshot, inputText string) ([]DetectedChange, []RequirementAnalysisResult, bool, error) {
	results := make([]requirementPrediction, 0, len(snapshot))
	threshold := selectedProvider.RelevanceThreshold()
	for _, req := range snapshot {
		text := singleRequirementText(req)
		if text == "" {
			continue
		}
		relevance := ScoreRequirementRelevance(req, inputText, threshold)
		results = append(results, requirementPrediction{
			requirement: req,
			text:        text,
			result: RequirementAnalysisResult{
				RequirementID: req.RequirementID,
				Title:         req.Title,
				Text:          text,
				RequestText:   inputText,
				Status:        "ignored",
				Relevance:     relevance,
			},
		})
	}
	if len(results) == 0 {
		return nil, nil, false, utils.ErrNotFound
	}
	rankRequirementPredictions(results)
	if err := ctx.Err(); err != nil {
		return nil, nil, false, err
	}

	changes := make([]DetectedChange, 0, len(results))
	hasAdded := false
	hasCoverage := false
	weakNonAddition := false
	for index := range results {
		prediction, err := selectedProvider.Predict(ctx, ModelAnalyzeRequest{BaselineRequirement: results[index].text, NewClientMessage: inputText})
		if err != nil {
			return nil, nil, true, err
		}
		prediction = normalizePredictionForRelevantRequirement(prediction, results[index].result.Relevance, results[index].text, inputText)
		label := strings.ToLower(strings.TrimSpace(prediction.Label))
		results[index].selected = true
		results[index].prediction = prediction
		results[index].result.Selected = true
		results[index].result.Status = "analyzed"
		results[index].result.Label = label
		if !prediction.LabelOnly {
			results[index].result.Confidence = prediction.Confidence
			results[index].result.Reasoning = prediction.Reasoning
		}
		if !validModelLabel(label) {
			return nil, nil, true, ErrInferenceBadResponse
		}
		if label == "added" {
			hasAdded = true
			continue
		}
		if label == "unchanged" {
			if results[index].result.Relevance.IsRelevant {
				hasCoverage = true
			}
			continue
		}
		if !results[index].result.Relevance.IsRelevant {
			weakNonAddition = true
			continue
		}
		if !prediction.LabelOnly && prediction.Confidence < 0.35 {
			weakNonAddition = true
			continue
		}
		for _, change := range predictionToChanges(prediction, inputText) {
			change.BaselineRequirementID = results[index].requirement.RequirementID
			change.BaselineRequirementTitle = results[index].requirement.Title
			change.OldText = results[index].text
			changes = append(changes, change)
		}
	}

	if len(changes) == 0 && !hasCoverage {
		if weakNonAddition || likelyCoveredInSnapshot(snapshot, inputText) || !hasAdded {
			changes = append(changes, scopeReviewChange(inputText, "The full snapshot was checked, but the model and scope wording do not establish a reliable new-versus-existing decision."))
		} else if hasAdded {
			changes = append(changes, proposedScopeAddition(inputText))
		}
	}
	out := make([]RequirementAnalysisResult, 0, len(results))
	for _, result := range results {
		out = append(out, result.result)
	}
	slog.Info("requirement_level_drift_analysis", "requirementsAnalyzed", len(results), "requirementsIgnored", 0, "providerType", selectedProvider.ProviderName())
	return changes, out, true, nil
}

func proposedScopeAddition(inputText string) DetectedChange {
	level := impact("added", strings.ToLower(inputText))
	hours := effort(level)
	return DetectedChange{
		ChangeType:      "added",
		Title:           title(inputText),
		Description:     "No requirement in the saved snapshot was classified as covering this request. Confirm the proposed addition before changing the agreement.",
		NewText:         inputText,
		Impact:          level,
		EstimatedEffort: &hours,
		Recommendation:  recommendation("added", title(inputText)),
	}
}

// High lexical coverage paired with an 'added' model label is a conflict,
// not evidence of novelty. This catches near-restatements such as an existing
// invoice PDF download requested again from the same client portal.
func likelyCoveredInSnapshot(snapshot []requirement.RequirementSnapshot, inputText string) bool {
	inputTokens := requirementTokens(inputText)
	for _, req := range snapshot {
		baselineTokens := requirementTokens(req.Title + " " + req.Description)
		matched := intersection(inputTokens, baselineTokens)
		if len(matched) >= 3 && len(inputTokens) > 0 && float64(len(matched))/float64(len(inputTokens)) >= 0.5 {
			return true
		}
	}
	return false
}

func rankRequirementPredictions(results []requirementPrediction) {
	sort.SliceStable(results, func(i, j int) bool {
		return results[i].result.Relevance.Score > results[j].result.Relevance.Score
	})
}

func normalizePredictionForRelevantRequirement(prediction ModelPrediction, relevance RelevanceResult, requirementText, inputText string) ModelPrediction {
	if prediction.LabelOnly {
		return prediction
	}
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
	title := strings.TrimSpace(req.Title)
	description := strings.TrimSpace(req.Description)
	if title == "" {
		return description
	}
	if description == "" {
		return title
	}
	return title + ": " + description
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
	"unavailable":   {"stock"},
	"restock":       {"stock", "inventory"},
	"rate":          {"rating", "review"},
	"parcel":        {"shipment"},
	"buyer":         {"customer", "shopper"},
	"anonymou":      {"guest"},
	"register":      {"account", "authentication"},
	"callback":      {"webhook"},
	"document":      {"file"},
	"upload":        {"file", "attachment"},
	"voucher":       {"promotion", "coupon"},
	"basket":        {"cart"},
	"discussion":    {"comment"},
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

// ScoreRequirementRelevance applies the deterministic production retrieval scorer.
// It is exported so evaluation tooling can measure retrieval independently of inference.
func ScoreRequirementRelevance(req requirement.RequirementSnapshot, inputText string, threshold float64) RelevanceResult {
	return TraceRequirementRelevance(req, inputText, threshold).Result
}

// TraceRequirementRelevance returns the exact scorer result and its
// intermediate values. Evaluation tooling uses this instead of duplicating
// production retrieval logic.
func TraceRequirementRelevance(req requirement.RequirementSnapshot, inputText string, threshold float64) RelevanceTrace {
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
	bonus := 0.0
	if len(matchedTerms) >= 2 && score < 0.45 {
		bonus = 0.12
		score += bonus
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
	return RelevanceTrace{
		Result: RelevanceResult{
			Score:          score,
			MatchedTerms:   sortedKeys(matchedTerms),
			MatchedDomains: sortedKeys(matchedDomains),
			IsRelevant:     relevant,
			Reason:         reason,
		},
		InputTokens:        sortedKeys(inputTokens),
		TitleTokens:        sortedKeys(titleTokens),
		BaselineTokens:     sortedKeys(baselineTokens),
		MatchedTitleTerms:  sortedKeys(matchedTitleTerms),
		InputDomains:       sortedKeys(inputDomains),
		BaselineDomains:    sortedKeys(baselineDomains),
		DirectScore:        directScore,
		TitleScore:         titleScore,
		DomainScore:        domainScore,
		MultiTermBonus:     bonus,
		Threshold:          threshold,
		PassedThreshold:    score >= threshold,
		PassedSpecificGate: hasSpecificMatch,
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
		token = normalizeRetrievalToken(token)
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

func normalizeRetrievalToken(token string) string {
	token = normalizeRequirementToken(token)
	if strings.HasSuffix(token, "ing") && len(token) > 5 {
		return normalizeRequirementVerbStem(strings.TrimSuffix(token, "ing"))
	}
	if strings.HasSuffix(token, "ed") && len(token) > 4 {
		return normalizeRequirementVerbStem(strings.TrimSuffix(token, "ed"))
	}
	return token
}

func normalizeRequirementVerbStem(stem string) string {
	if len(stem) >= 2 && stem[len(stem)-1] == stem[len(stem)-2] && strings.ContainsRune("bdgmnprt", rune(stem[len(stem)-1])) {
		return stem[:len(stem)-1]
	}
	if strings.HasSuffix(stem, "at") || strings.HasSuffix(stem, "iz") || strings.HasSuffix(stem, "us") {
		return stem + "e"
	}
	return stem
}

func matchedDomainSet(tokens map[string]struct{}) map[string]struct{} {
	out := map[string]struct{}{}
	for domain, keywords := range domainKeywords {
		for _, keyword := range keywords {
			normalized := normalizeRetrievalToken(keyword)
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

func scopeReviewChange(inputText, explanation string) DetectedChange {
	return DetectedChange{
		ChangeType:     "ambiguous",
		Title:          title(inputText),
		Description:    explanation,
		NewText:        inputText,
		Impact:         "low",
		Recommendation: "Compare this request with the full saved scope before recording it as new or unchanged.",
		ReviewRequired: true,
	}
}

func hasScopeReview(changes []DetectedChange) bool {
	for _, change := range changes {
		if change.ReviewRequired {
			return true
		}
	}
	return false
}

func scoreWithScopeReview(changes []DetectedChange) (int, string, map[string]int, float64, string) {
	scoreable := make([]DetectedChange, 0, len(changes))
	reviewCount := 0
	for _, change := range changes {
		if change.ReviewRequired {
			reviewCount++
		} else {
			scoreable = append(scoreable, change)
		}
	}
	score, risk, counts, hours, _ := Score(scoreable)
	counts["ambiguous"] += reviewCount
	return score, risk, counts, hours, "Scope review required before deciding whether the request changes the agreement."
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

func (s Service) Get(ctx context.Context, id, userID primitive.ObjectID) (DriftAnalysis, error) {
	var a DriftAnalysis
	err := s.db.Collection("driftanalyses").FindOne(ctx, bson.M{"_id": id}).Decode(&a)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return a, utils.ErrNotFound
	}
	if err != nil {
		return a, err
	}
	_, err = authorization.RequireProjectAccess(ctx, s.db, a.Project, userID)
	return a, err
}
func (s Service) List(ctx context.Context, projectID, userID primitive.ObjectID) ([]DriftAnalysis, error) {
	if _, err := authorization.RequireProjectAccess(ctx, s.db, projectID, userID); err != nil {
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
	if _, err := authorization.RequireProjectCapability(ctx, s.db, a.Project, userID, authorization.CapabilityWrite); err != nil {
		return err
	}
	_, err = s.db.Collection("driftanalyses").DeleteOne(ctx, bson.M{"_id": id})
	if err == nil {
		activity.Log(ctx, s.db, a.Workspace, userID, "DRIFT_ANALYSIS_DELETED", "DriftAnalysis", id.Hex(), bson.M{
			"projectId":   a.Project.Hex(),
			"projectName": s.projectName(ctx, a.Project),
			"inputType":   a.InputType,
			"inputText":   activitySnippet(a.InputText),
			"summary":     activitySnippet(a.Summary),
			"driftScore":  a.DriftScore,
			"riskLevel":   a.RiskLevel,
		})
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

func activitySnippet(value string) string {
	text := strings.Join(strings.Fields(value), " ")
	if len(text) <= 120 {
		return text
	}
	return strings.TrimSpace(text[:117]) + "..."
}

func (s Service) projectName(ctx context.Context, projectID primitive.ObjectID) string {
	var project struct {
		Name string `bson:"name"`
	}
	if s.db.Collection("projects").FindOne(ctx, bson.M{"_id": projectID}).Decode(&project) != nil {
		return ""
	}
	return project.Name
}
