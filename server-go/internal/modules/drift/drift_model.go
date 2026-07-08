package drift

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DetectedChange struct {
	ChangeType               string   `bson:"changeType" json:"changeType"`
	Title                    string   `bson:"title" json:"title"`
	Description              string   `bson:"description" json:"description"`
	AffectedModules          []string `bson:"affectedModules,omitempty" json:"affectedModules,omitempty"`
	BaselineRequirementID    string   `bson:"baselineRequirementId,omitempty" json:"baselineRequirementId,omitempty"`
	BaselineRequirementTitle string   `bson:"baselineRequirementTitle,omitempty" json:"baselineRequirementTitle,omitempty"`
	NewText                  string   `bson:"newText,omitempty" json:"newText,omitempty"`
	OldText                  string   `bson:"oldText,omitempty" json:"oldText,omitempty"`
	Impact                   string   `bson:"impact" json:"impact"`
	EstimatedEffort          *float64 `bson:"estimatedEffort,omitempty" json:"estimatedEffort,omitempty"`
	Confidence               int      `bson:"confidence" json:"confidence"`
	Recommendation           string   `bson:"recommendation" json:"recommendation"`
}

type RelevanceResult struct {
	Score          float64  `bson:"score" json:"score"`
	MatchedTerms   []string `bson:"matchedTerms" json:"matchedTerms"`
	MatchedDomains []string `bson:"matchedDomains" json:"matchedDomains"`
	IsRelevant     bool     `bson:"isRelevant" json:"isRelevant"`
	Reason         string   `bson:"reason" json:"reason"`
}

type RequirementAnalysisResult struct {
	RequirementID string          `bson:"requirementId" json:"requirementId"`
	Title         string          `bson:"title" json:"title"`
	Text          string          `bson:"text" json:"text"`
	Status        string          `bson:"status" json:"status"`
	Selected      bool            `bson:"selected" json:"selected"`
	Relevance     RelevanceResult `bson:"relevance" json:"relevance"`
	Label         string          `bson:"label,omitempty" json:"label,omitempty"`
	Confidence    float64         `bson:"confidence,omitempty" json:"confidence,omitempty"`
	Reasoning     string          `bson:"reasoning,omitempty" json:"reasoning,omitempty"`
}

type AnalysisPreview struct {
	ProjectID             string                      `json:"projectId"`
	WorkspaceID           string                      `json:"workspaceId,omitempty"`
	BaselineVersionID     string                      `json:"baselineVersionId"`
	BaselineVersionNumber int                         `json:"baselineVersionNumber"`
	InputType             string                      `json:"inputType"`
	InputText             string                      `json:"inputText"`
	DriftScore            int                         `json:"driftScore"`
	RiskLevel             string                      `json:"riskLevel"`
	Summary               string                      `json:"summary"`
	DetectedChanges       []DetectedChange            `json:"detectedChanges"`
	RequirementResults    []RequirementAnalysisResult `json:"requirementResults"`
	AddedCount            int                         `json:"addedCount"`
	ModifiedCount         int                         `json:"modifiedCount"`
	RemovedCount          int                         `json:"removedCount"`
	AmbiguousCount        int                         `json:"ambiguousCount"`
	ContradictionCount    int                         `json:"contradictionCount"`
	EstimatedExtraHours   float64                     `json:"estimatedExtraHours"`
	AnalysisEngine        string                      `json:"analysisEngine"`
}

type DriftAnalysis struct {
	ID                    primitive.ObjectID          `bson:"_id,omitempty" json:"_id"`
	Project               primitive.ObjectID          `bson:"project" json:"project"`
	Workspace             primitive.ObjectID          `bson:"workspace" json:"workspace"`
	BaselineVersion       primitive.ObjectID          `bson:"baselineVersion" json:"baselineVersion"`
	BaselineVersionNumber int                         `bson:"baselineVersionNumber" json:"baselineVersionNumber"`
	InputType             string                      `bson:"inputType" json:"inputType"`
	InputText             string                      `bson:"inputText" json:"inputText"`
	DriftScore            int                         `bson:"driftScore" json:"driftScore"`
	RiskLevel             string                      `bson:"riskLevel" json:"riskLevel"`
	Summary               string                      `bson:"summary" json:"summary"`
	DetectedChanges       []DetectedChange            `bson:"detectedChanges" json:"detectedChanges"`
	RequirementResults    []RequirementAnalysisResult `bson:"requirementResults,omitempty" json:"requirementResults,omitempty"`
	AddedCount            int                         `bson:"addedCount" json:"addedCount"`
	ModifiedCount         int                         `bson:"modifiedCount" json:"modifiedCount"`
	RemovedCount          int                         `bson:"removedCount" json:"removedCount"`
	AmbiguousCount        int                         `bson:"ambiguousCount" json:"ambiguousCount"`
	ContradictionCount    int                         `bson:"contradictionCount" json:"contradictionCount"`
	EstimatedExtraHours   float64                     `bson:"estimatedExtraHours" json:"estimatedExtraHours"`
	AnalysisEngine        string                      `bson:"analysisEngine" json:"analysisEngine"`
	Status                string                      `bson:"status" json:"status"`
	CreatedBy             primitive.ObjectID          `bson:"createdBy" json:"createdBy"`
	CreatedAt             time.Time                   `bson:"createdAt" json:"createdAt"`
	UpdatedAt             time.Time                   `bson:"updatedAt" json:"updatedAt"`
}
