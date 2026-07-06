package change_request

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChangeRequestChange struct {
	Title           string   `bson:"title" json:"title"`
	Description     string   `bson:"description" json:"description"`
	ChangeType      string   `bson:"changeType" json:"changeType"`
	Impact          string   `bson:"impact" json:"impact"`
	AffectedModules []string `bson:"affectedModules,omitempty" json:"affectedModules,omitempty"`
	EstimatedEffort *float64 `bson:"estimatedEffort,omitempty" json:"estimatedEffort,omitempty"`
}

type ChangeRequest struct {
	ID                primitive.ObjectID    `bson:"_id,omitempty" json:"_id"`
	Project           primitive.ObjectID    `bson:"project" json:"project"`
	Workspace         primitive.ObjectID    `bson:"workspace" json:"workspace"`
	DriftAnalysis     primitive.ObjectID    `bson:"driftAnalysis" json:"driftAnalysis"`
	Title             string                `bson:"title" json:"title"`
	ClientName        string                `bson:"clientName" json:"clientName"`
	Summary           string                `bson:"summary" json:"summary"`
	ChangesRequested  []ChangeRequestChange `bson:"changesRequested" json:"changesRequested"`
	BusinessReason    string                `bson:"businessReason" json:"businessReason"`
	TimelineImpact    string                `bson:"timelineImpact" json:"timelineImpact"`
	CostImpact        string                `bson:"costImpact" json:"costImpact"`
	RecommendedAction string                `bson:"recommendedAction" json:"recommendedAction"`
	ApprovalNote      string                `bson:"approvalNote" json:"approvalNote"`
	Status            string                `bson:"status" json:"status"`
	GeneratedBy       string                `bson:"generatedBy" json:"generatedBy"`
	CreatedBy         primitive.ObjectID    `bson:"createdBy" json:"createdBy"`
	CreatedAt         time.Time             `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time             `bson:"updatedAt" json:"updatedAt"`
}

type Draft struct {
	DriftAnalysisID   string                `json:"driftAnalysisId"`
	Title             string                `json:"title"`
	ClientName        string                `json:"clientName"`
	Summary           string                `json:"summary"`
	ChangesRequested  []ChangeRequestChange `json:"changesRequested"`
	BusinessReason    string                `json:"businessReason"`
	TimelineImpact    string                `json:"timelineImpact"`
	CostImpact        string                `json:"costImpact"`
	RecommendedAction string                `json:"recommendedAction"`
	ApprovalNote      string                `json:"approvalNote"`
	Status            string                `json:"status"`
	GeneratedBy       string                `json:"generatedBy"`
}
