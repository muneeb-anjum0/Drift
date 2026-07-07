package billing

import (
	"context"
	"time"

	"driftledger/server-go/internal/modules/evaluation"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Service struct {
	db         *mongo.Database
	evaluation evaluation.Service
}

func NewService(db *mongo.Database) Service {
	return Service{db: db, evaluation: evaluation.NewService(db)}
}

func (s Service) Summary(ctx context.Context, userID primitive.ObjectID) (Summary, error) {
	workspaceIDs, err := s.workspaceIDs(ctx, userID)
	if err != nil {
		return Summary{}, err
	}
	projectIDs, err := s.projectIDs(ctx, workspaceIDs)
	if err != nil {
		return Summary{}, err
	}
	counts, err := s.counts(ctx, projectIDs)
	if err != nil {
		return Summary{}, err
	}
	if summary, err := s.evaluation.Summary(ctx, userID); err == nil && summary.HasReport {
		counts.EvaluationRate = summary.PassRate
	}
	return BuildSummary(counts), nil
}

func BuildSummary(counts Counts) Summary {
	return Summary{
		PlanName:       "DriftLedger Local Pro",
		Status:         "active_demo",
		Price:          "$19/month",
		RenewalDate:    time.Now().UTC().AddDate(0, 1, 0).Format("Jan 2, 2006"),
		Projects:       counts.Projects,
		SavedAnalyses:  counts.SavedAnalyses,
		ChangeRequests: counts.ChangeRequests,
		Approvals:      counts.Approvals,
		EvaluationRate: counts.EvaluationRate,
		LocalInference: true,
		Model:          "Qwen2.5-7B + DriftLedger LoRA",
		Quantization:   "Q4_K_M",
		RuntimeNote:    "Demo billing only. Project data and AI inference stay local-first through Docker and the GGUF runtime.",
	}
}

func (s Service) workspaceIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	cursor, err := s.db.Collection("workspacemembers").Find(ctx, bson.M{"user": userID})
	if err != nil {
		return nil, err
	}
	var rows []struct {
		Workspace primitive.ObjectID `bson:"workspace"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	ids := make([]primitive.ObjectID, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.Workspace)
	}
	return ids, nil
}

func (s Service) projectIDs(ctx context.Context, workspaceIDs []primitive.ObjectID) ([]primitive.ObjectID, error) {
	if len(workspaceIDs) == 0 {
		return []primitive.ObjectID{}, nil
	}
	cursor, err := s.db.Collection("projects").Find(ctx, bson.M{"workspace": bson.M{"$in": workspaceIDs}})
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	ids := make([]primitive.ObjectID, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	return ids, nil
}

func (s Service) counts(ctx context.Context, projectIDs []primitive.ObjectID) (Counts, error) {
	if len(projectIDs) == 0 {
		return Counts{}, nil
	}
	filter := bson.M{"project": bson.M{"$in": projectIDs}}
	projects := int64(len(projectIDs))
	analyses, err := s.db.Collection("driftanalyses").CountDocuments(ctx, filter)
	if err != nil {
		return Counts{}, err
	}
	changeRequests, err := s.db.Collection("changerequests").CountDocuments(ctx, filter)
	if err != nil {
		return Counts{}, err
	}
	approvals, err := s.db.Collection("changerequests").CountDocuments(ctx, bson.M{"project": bson.M{"$in": projectIDs}, "approvalStatus": bson.M{"$in": []string{"pending_approval", "approved", "rejected", "needs_revision"}}})
	if err != nil {
		return Counts{}, err
	}
	return Counts{Projects: projects, SavedAnalyses: analyses, ChangeRequests: changeRequests, Approvals: approvals}, nil
}
