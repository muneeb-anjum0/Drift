package change_request

import (
	"context"
	"errors"
	"fmt"
	"time"

	"driftledger/server-go/internal/modules/activity"
	"driftledger/server-go/internal/modules/drift"
	"driftledger/server-go/internal/ollama"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service struct {
	db     *mongo.Database
	ollama ollama.Service
}

func NewService(db *mongo.Database, ollama ollama.Service) Service {
	return Service{db: db, ollama: ollama}
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
	changes := make([]ChangeRequestChange, 0, len(analysis.DetectedChanges))
	for _, c := range analysis.DetectedChanges {
		changes = append(changes, ChangeRequestChange{Title: c.Title, Description: c.Description, ChangeType: c.ChangeType, Impact: c.Impact, EstimatedEffort: c.EstimatedEffort})
	}
	draft := Draft{DriftAnalysisID: id.Hex(), Title: "Change Request - " + project.Name, ClientName: project.Client, Summary: analysis.Summary, ChangesRequested: changes, BusinessReason: fmt.Sprintf("The current request introduces %d change(s) compared to the approved baseline.", len(changes)), TimelineImpact: fmt.Sprintf("Estimated additional delivery time: approximately %.0f hour(s).", analysis.EstimatedExtraHours), CostImpact: "This request contains scope changes that should be reviewed before implementation.", RecommendedAction: "Review the scope delta, confirm approval, and update estimates before implementation begins.", ApprovalNote: "Please review and approve this change request before implementation begins. Approval confirms that the listed changes are accepted as an expansion or modification of the original scope.", Status: "draft", GeneratedBy: analysis.AnalysisEngine}
	if p.UseOllama {
		raw := map[string]any{"summary": draft.Summary, "businessReason": draft.BusinessReason, "timelineImpact": draft.TimelineImpact, "costImpact": draft.CostImpact, "recommendedAction": draft.RecommendedAction, "approvalNote": draft.ApprovalNote}
		if enhanced, ok := s.ollama.EnhanceChangeRequest(ctx, raw, p.OllamaModel); ok {
			if v, ok := enhanced["summary"].(string); ok {
				draft.Summary = v
			}
			if v, ok := enhanced["businessReason"].(string); ok {
				draft.BusinessReason = v
			}
			if v, ok := enhanced["timelineImpact"].(string); ok {
				draft.TimelineImpact = v
			}
			if v, ok := enhanced["costImpact"].(string); ok {
				draft.CostImpact = v
			}
			if v, ok := enhanced["recommendedAction"].(string); ok {
				draft.RecommendedAction = v
			}
			if v, ok := enhanced["approvalNote"].(string); ok {
				draft.ApprovalNote = v
			}
			draft.GeneratedBy = "hybrid"
		}
	}
	return draft, nil
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
	cr := ChangeRequest{ID: utils.NewID(), Project: analysis.Project, Workspace: analysis.Workspace, DriftAnalysis: driftID, Title: p.Title, ClientName: p.ClientName, Summary: p.Summary, ChangesRequested: p.ChangesRequested, BusinessReason: p.BusinessReason, TimelineImpact: p.TimelineImpact, CostImpact: p.CostImpact, RecommendedAction: p.RecommendedAction, ApprovalNote: p.ApprovalNote, Status: def(p.Status, "draft"), GeneratedBy: def(p.GeneratedBy, analysis.AnalysisEngine), CreatedBy: userID, CreatedAt: now, UpdatedAt: now}
	_, err = s.db.Collection("changerequests").InsertOne(ctx, cr)
	if err == nil {
		activity.Log(ctx, s.db, analysis.Workspace, userID, "CHANGE_REQUEST_CREATED", "ChangeRequest", cr.ID.Hex(), bson.M{"title": cr.Title})
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
	return out, err
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
		activity.Log(ctx, s.db, cr.Workspace, userID, "CHANGE_REQUEST_UPDATED", "ChangeRequest", id.Hex(), bson.M{})
	}
	return s.Get(ctx, id, userID)
}
func (s Service) Delete(ctx context.Context, id, userID primitive.ObjectID) error {
	cr, err := s.Get(ctx, id, userID)
	if err != nil {
		return err
	}
	_, err = s.db.Collection("changerequests").DeleteOne(ctx, bson.M{"_id": id})
	if err == nil {
		activity.Log(ctx, s.db, cr.Workspace, userID, "CHANGE_REQUEST_DELETED", "ChangeRequest", id.Hex(), bson.M{})
	}
	return err
}
func def(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
