package change_request

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"driftledger/server-go/internal/modules/activity"
	"driftledger/server-go/internal/modules/drift"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service struct {
	db *mongo.Database
}

const (
	ApprovalDraft         = "draft"
	ApprovalPending       = "pending_approval"
	ApprovalApproved      = "approved"
	ApprovalRejected      = "rejected"
	ApprovalNeedsRevision = "needs_revision"
	maxApprovalNoteLength = 1200
)

var ErrInvalidApprovalAction = errors.New("invalid approval action")

func NewService(db *mongo.Database) Service {
	return Service{db: db}
}

func (s Service) Generate(ctx context.Context, userID primitive.ObjectID, p GenerateRequest) (Draft, error) {
	id, err := utils.ObjectID(p.DriftAnalysisID)
	if err != nil {
		return Draft{}, err
	}
	var analysis drift.DriftAnalysis
	if err := s.db.Collection("driftanalyses").FindOne(ctx, bson.M{"_id": id}).Decode(&analysis); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return Draft{}, utils.ErrNotFound
		}
		return Draft{}, err
	}
	project, err := utils.RequireProjectAccess(ctx, s.db, analysis.Project, userID)
	if err != nil {
		return Draft{}, err
	}
	if len(analysis.DetectedChanges) == 0 {
		return Draft{}, errors.New("no change request is needed for an unchanged drift analysis")
	}
	grouped := drift.CleanDetectedChanges(analysis.DetectedChanges, analysis.InputText)
	if len(grouped) == 0 {
		return Draft{}, errors.New("no change request is needed for an unchanged drift analysis")
	}
	changes := changeRequestChanges(grouped)
	hours := groupedHours(grouped)
	title := changeRequestTitle(project.Name, grouped)
	summary := changeRequestSummary(analysis, grouped)
	draft := Draft{DriftAnalysisID: id.Hex(), Title: title, ClientName: project.Client, Summary: summary, ChangesRequested: changes, BusinessReason: businessReason(grouped), TimelineImpact: timelineImpact(hours), CostImpact: costImpact(grouped, hours), RecommendedAction: recommendedAction(grouped), ApprovalNote: approvalNote(grouped), Status: "draft", GeneratedBy: analysis.AnalysisEngine}
	return draft, nil
}

func changeRequestChanges(changes []drift.DetectedChange) []ChangeRequestChange {
	out := make([]ChangeRequestChange, 0, len(changes))
	for _, c := range changes {
		out = append(out, ChangeRequestChange{Title: c.Title, Description: drift.CleanReasoning(c.Description), ChangeType: c.ChangeType, Impact: c.Impact, AffectedModules: drift.AffectedModules(c), EstimatedEffort: c.EstimatedEffort})
	}
	return out
}

func changeRequestTitle(projectName string, changes []drift.DetectedChange) string {
	if len(changes) == 1 && strings.TrimSpace(changes[0].Title) != "" {
		return changes[0].Title
	}
	for _, change := range changes {
		if change.Impact == "high" || change.Impact == "critical" {
			return change.Title
		}
	}
	if strings.TrimSpace(projectName) == "" {
		return "Change Request"
	}
	return "Change Request - " + projectName
}

func changeRequestSummary(analysis drift.DriftAnalysis, changes []drift.DetectedChange) string {
	if len(changes) == 1 {
		return drift.CleanReasoning(changes[0].Description)
	}
	parts := make([]string, 0, len(changes))
	for _, change := range changes {
		parts = append(parts, change.Title)
	}
	return drift.CleanReasoning(fmt.Sprintf("The client requested %d grouped scope change(s): %s.", len(changes), strings.Join(parts, "; ")))
}

func businessReason(changes []drift.DetectedChange) string {
	if len(changes) == 0 {
		return "No meaningful scope drift was detected."
	}
	text := strings.ToLower(changes[0].Title + " " + changes[0].Description)
	switch {
	case strings.Contains(text, "family") || strings.Contains(text, "relative"):
		return "This request adds family member access to patient information. It requires delegated account permissions, privacy boundaries, and controlled visibility across appointments, prescriptions, invoices, payment status, and notifications."
	case strings.Contains(text, "parent"):
		return "This request expands the student-only portal by adding parent access. It requires role-based permissions and controlled visibility into student academic and billing information."
	case strings.Contains(text, "sms otp"):
		return "This request adds an additional recovery method to improve account access and reduce dependency on email-only password reset."
	case strings.Contains(text, "clinic analytics"):
		return "This request changes clinic reporting from static CSV exports into an interactive analytics experience, increasing dashboard, filtering, charting, and downloadable snapshot scope."
	case strings.Contains(text, "interactive"):
		return "This request changes static report downloads into an interactive reporting experience, increasing reporting UI, data filtering, and visualization scope."
	case strings.Contains(text, "card payment"):
		return "This request changes the first-release billing scope by removing card payment and limiting the release to fee-status visibility."
	case strings.Contains(text, "cancellation"):
		return "This request changes the approved appointment cancellation policy and should be reviewed because it affects patient scheduling behavior, clinic operations, and notification rules."
	case strings.Contains(text, "clarify") || strings.Contains(text, "dashboard improvements"):
		return "This request is not specific enough for implementation. The client needs to clarify the intended dashboard behavior, affected data, and acceptance criteria."
	case strings.Contains(text, "assignment"):
		return "This request changes assignment submission rules and requires confirmation of deadline and penalty behavior before implementation."
	default:
		return "This request changes the approved baseline and should be reviewed before implementation continues."
	}
}

func timelineImpact(hours float64) string {
	if hours <= 0 {
		return "No additional delivery time is expected because no meaningful scope drift was detected."
	}
	return fmt.Sprintf("Estimated additional delivery time is approximately %.0f hour(s), subject to confirmation during planning.", hours)
}

func costImpact(changes []drift.DetectedChange, hours float64) string {
	impact := highestImpact(changes)
	if impact == "high" || impact == "critical" || hours >= 16 {
		return "High cost impact because the request affects multiple product areas or introduces significant implementation scope."
	}
	if impact == "medium" || hours >= 6 {
		return "Medium cost impact because the request changes approved scope and requires implementation effort."
	}
	return "Low cost impact because the request appears limited in scope."
}

func recommendedAction(changes []drift.DetectedChange) string {
	if len(changes) == 1 && changes[0].ChangeType == "ambiguous" {
		return "Clarify the requested behavior, affected users, and acceptance criteria before implementation is estimated."
	}
	return "Review the grouped scope change, confirm approval, and update estimates before implementation begins."
}

func approvalNote(changes []drift.DetectedChange) string {
	if len(changes) == 1 && changes[0].ChangeType == "ambiguous" {
		return "Client clarification is needed before this can become an implementation-ready change request."
	}
	return "Please approve this change request before implementation begins. Approval confirms the listed scope change is accepted as an addition, modification, or removal from the original baseline."
}

func groupedHours(changes []drift.DetectedChange) float64 {
	total := 0.0
	for _, change := range changes {
		if change.EstimatedEffort != nil {
			total += *change.EstimatedEffort
		}
	}
	return total
}

func highestImpact(changes []drift.DetectedChange) string {
	out := "low"
	for _, change := range changes {
		if impactWeight(change.Impact) > impactWeight(out) {
			out = change.Impact
		}
	}
	return out
}

func impactWeight(impact string) int {
	switch impact {
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

func (s Service) Save(ctx context.Context, userID primitive.ObjectID, p SaveRequest) (ChangeRequest, error) {
	driftID, err := utils.ObjectID(p.DriftAnalysisID)
	if err != nil {
		return ChangeRequest{}, err
	}
	var analysis drift.DriftAnalysis
	if err := s.db.Collection("driftanalyses").FindOne(ctx, bson.M{"_id": driftID}).Decode(&analysis); err != nil {
		return ChangeRequest{}, utils.ErrNotFound
	}
	if _, err := utils.RequireProjectAccess(ctx, s.db, analysis.Project, userID); err != nil {
		return ChangeRequest{}, err
	}
	now := time.Now().UTC()
	cr := ChangeRequest{ID: utils.NewID(), Project: analysis.Project, Workspace: analysis.Workspace, DriftAnalysis: driftID, Title: p.Title, ClientName: p.ClientName, Summary: p.Summary, ChangesRequested: p.ChangesRequested, BusinessReason: p.BusinessReason, TimelineImpact: p.TimelineImpact, CostImpact: p.CostImpact, RecommendedAction: p.RecommendedAction, ApprovalNote: p.ApprovalNote, Status: def(p.Status, "draft"), ApprovalStatus: ApprovalDraft, GeneratedBy: def(p.GeneratedBy, analysis.AnalysisEngine), CreatedBy: userID, CreatedAt: now, UpdatedAt: now}
	_, err = s.db.Collection("changerequests").InsertOne(ctx, cr)
	if err == nil {
		activity.Log(ctx, s.db, analysis.Workspace, userID, "CHANGE_REQUEST_CREATED", "ChangeRequest", cr.ID.Hex(), bson.M{
			"projectId":      cr.Project.Hex(),
			"title":          cr.Title,
			"summary":        activitySnippet(cr.Summary),
			"approvalStatus": cr.ApprovalStatus,
		})
	}
	return cr, err
}

func (s Service) Get(ctx context.Context, id, userID primitive.ObjectID) (ChangeRequest, error) {
	var cr ChangeRequest
	err := s.db.Collection("changerequests").FindOne(ctx, bson.M{"_id": id}).Decode(&cr)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return cr, utils.ErrNotFound
	}
	if err != nil {
		return cr, err
	}
	_, err = utils.RequireProjectAccess(ctx, s.db, cr.Project, userID)
	cr.normalizeApproval()
	return cr, err
}
func (s Service) List(ctx context.Context, projectID, userID primitive.ObjectID) ([]ChangeRequest, error) {
	if _, err := utils.RequireProjectAccess(ctx, s.db, projectID, userID); err != nil {
		return nil, err
	}
	cursor, err := s.db.Collection("changerequests").Find(ctx, bson.M{"project": projectID}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	var out []ChangeRequest
	err = cursor.All(ctx, &out)
	normalizeApprovals(out)
	return out, err
}

func (s Service) ListApprovals(ctx context.Context, userID primitive.ObjectID) ([]ChangeRequest, error) {
	cursor, err := s.db.Collection("changerequests").Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "updatedAt", Value: -1}}))
	if err != nil {
		return nil, err
	}
	var all []ChangeRequest
	if err := cursor.All(ctx, &all); err != nil {
		return nil, err
	}
	out := make([]ChangeRequest, 0, len(all))
	for _, cr := range all {
		if _, err := utils.RequireProjectAccess(ctx, s.db, cr.Project, userID); err == nil {
			cr.normalizeApproval()
			out = append(out, cr)
		} else if !errors.Is(err, utils.ErrForbidden) && !errors.Is(err, utils.ErrNotFound) {
			return nil, err
		}
	}
	return out, nil
}

func (s Service) Update(ctx context.Context, id, userID primitive.ObjectID, p UpdateRequest) (ChangeRequest, error) {
	cr, err := s.Get(ctx, id, userID)
	if err != nil {
		return cr, err
	}
	update := bson.M{"updatedAt": time.Now().UTC()}
	if p.Title != "" {
		update["title"] = p.Title
	}
	if p.ClientName != "" {
		update["clientName"] = p.ClientName
	}
	if p.Summary != "" {
		update["summary"] = p.Summary
	}
	if p.BusinessReason != "" {
		update["businessReason"] = p.BusinessReason
	}
	if p.TimelineImpact != "" {
		update["timelineImpact"] = p.TimelineImpact
	}
	if p.CostImpact != "" {
		update["costImpact"] = p.CostImpact
	}
	if p.RecommendedAction != "" {
		update["recommendedAction"] = p.RecommendedAction
	}
	if p.ApprovalNote != "" {
		update["approvalNote"] = p.ApprovalNote
	}
	if p.Status != "" {
		update["status"] = p.Status
	}
	_, err = s.db.Collection("changerequests").UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	if err == nil {
		activity.Log(ctx, s.db, cr.Workspace, userID, "CHANGE_REQUEST_UPDATED", "ChangeRequest", id.Hex(), bson.M{
			"projectId":      cr.Project.Hex(),
			"title":          def(updateString(update, "title"), cr.Title),
			"summary":        activitySnippet(def(updateString(update, "summary"), cr.Summary)),
			"approvalStatus": cr.ApprovalStatus,
		})
	}
	return s.Get(ctx, id, userID)
}

func (s Service) SubmitForApproval(ctx context.Context, id, userID primitive.ObjectID, note string) (ChangeRequest, error) {
	return s.setApprovalStatus(ctx, id, userID, ApprovalPending, note)
}

func (s Service) Approve(ctx context.Context, id, userID primitive.ObjectID, note string) (ChangeRequest, error) {
	return s.setApprovalStatus(ctx, id, userID, ApprovalApproved, note)
}

func (s Service) Reject(ctx context.Context, id, userID primitive.ObjectID, note string) (ChangeRequest, error) {
	return s.setApprovalStatus(ctx, id, userID, ApprovalRejected, note)
}

func (s Service) NeedsRevision(ctx context.Context, id, userID primitive.ObjectID, note string) (ChangeRequest, error) {
	return s.setApprovalStatus(ctx, id, userID, ApprovalNeedsRevision, note)
}

func (s Service) setApprovalStatus(ctx context.Context, id, userID primitive.ObjectID, nextStatus, note string) (ChangeRequest, error) {
	cr, err := s.Get(ctx, id, userID)
	if err != nil {
		return cr, err
	}
	note = strings.TrimSpace(note)
	if len(note) > maxApprovalNoteLength {
		return cr, ErrInvalidApprovalAction
	}
	if err := validateApprovalTransition(cr.ApprovalStatus, nextStatus); err != nil {
		return cr, err
	}
	now := time.Now().UTC()
	actorName := s.actorName(ctx, userID)
	event := ApprovalEvent{Status: nextStatus, Note: note, Actor: userID, ActorName: actorName, CreatedAt: now}
	set := bson.M{"approvalStatus": nextStatus, "updatedAt": now}
	if nextStatus == ApprovalPending {
		set["submittedAt"] = now
		set["decisionBy"] = nil
		set["decisionByName"] = ""
		set["decisionAt"] = nil
		set["decisionNote"] = ""
	} else {
		set["decisionBy"] = userID
		set["decisionByName"] = actorName
		set["decisionAt"] = now
		set["decisionNote"] = note
	}
	_, err = s.db.Collection("changerequests").UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set, "$push": bson.M{"approvalHistory": event}})
	if err != nil {
		return cr, err
	}
	activity.Log(ctx, s.db, cr.Workspace, userID, "CHANGE_REQUEST_APPROVAL_UPDATED", "ChangeRequest", id.Hex(), bson.M{"projectId": cr.Project.Hex(), "title": cr.Title, "approvalStatus": nextStatus})
	return s.Get(ctx, id, userID)
}

func validateApprovalTransition(current, next string) error {
	current = normalizedApprovalStatus(current)
	switch next {
	case ApprovalPending:
		if current == ApprovalDraft || current == ApprovalNeedsRevision || current == ApprovalRejected {
			return nil
		}
	case ApprovalApproved, ApprovalRejected, ApprovalNeedsRevision:
		if current == ApprovalPending {
			return nil
		}
	}
	return ErrInvalidApprovalAction
}

func (s Service) actorName(ctx context.Context, userID primitive.ObjectID) string {
	var user struct {
		Name  string `bson:"name"`
		Email string `bson:"email"`
	}
	if err := s.db.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return "Approver"
	}
	if strings.TrimSpace(user.Name) != "" {
		return user.Name
	}
	if parts := strings.Split(user.Email, "@"); len(parts) > 0 && strings.TrimSpace(parts[0]) != "" {
		return parts[0]
	}
	return "Approver"
}

func normalizeApprovals(changeRequests []ChangeRequest) {
	for i := range changeRequests {
		changeRequests[i].normalizeApproval()
	}
}

func (cr *ChangeRequest) normalizeApproval() {
	cr.ApprovalStatus = normalizedApprovalStatus(cr.ApprovalStatus)
}

func normalizedApprovalStatus(status string) string {
	switch status {
	case ApprovalPending, ApprovalApproved, ApprovalRejected, ApprovalNeedsRevision:
		return status
	default:
		return ApprovalDraft
	}
}

func (s Service) Delete(ctx context.Context, id, userID primitive.ObjectID) error {
	cr, err := s.Get(ctx, id, userID)
	if err != nil {
		return err
	}
	_, err = s.db.Collection("changerequests").DeleteOne(ctx, bson.M{"_id": id})
	if err == nil {
		activity.Log(ctx, s.db, cr.Workspace, userID, "CHANGE_REQUEST_DELETED", "ChangeRequest", id.Hex(), bson.M{
			"projectId":      cr.Project.Hex(),
			"projectName":    s.projectName(ctx, cr.Project),
			"title":          cr.Title,
			"summary":        activitySnippet(cr.Summary),
			"approvalStatus": cr.ApprovalStatus,
		})
	}
	return err
}
func def(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func updateString(update bson.M, key string) string {
	if value, ok := update[key].(string); ok {
		return value
	}
	return ""
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
