package activity

import (
	"context"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (h Handler) enrichActivities(ctx context.Context, activities []ActivityLog) {
	for i := range activities {
		h.enrichActivity(ctx, &activities[i])
	}
}

func (h Handler) enrichActivity(ctx context.Context, activity *ActivityLog) {
	switch activity.EntityType {
	case "Project":
		h.enrichProjectActivity(ctx, activity)
	case "Requirement":
		h.enrichRequirementActivity(ctx, activity)
	case "RequirementVersion":
		h.enrichBaselineActivity(ctx, activity)
	case "DriftAnalysis":
		h.enrichDriftActivity(ctx, activity)
	case "ChangeRequest":
		h.enrichChangeRequestActivity(ctx, activity)
	}
}

func (h Handler) enrichProjectActivity(ctx context.Context, activity *ActivityLog) {
	id, ok := entityObjectID(activity.EntityID)
	if !ok {
		return
	}
	var project struct {
		Name       string `bson:"name"`
		ClientName string `bson:"clientName"`
		Status     string `bson:"status"`
	}
	if h.db.Collection("projects").FindOne(ctx, bson.M{"_id": id}).Decode(&project) != nil {
		return
	}
	metadata := metadataFor(activity)
	putIfMissing(metadata, "name", project.Name)
	putIfMissing(metadata, "clientName", project.ClientName)
	putIfMissing(metadata, "status", project.Status)
}

func (h Handler) enrichRequirementActivity(ctx context.Context, activity *ActivityLog) {
	id, ok := entityObjectID(activity.EntityID)
	if !ok {
		return
	}
	var requirement struct {
		Project     primitive.ObjectID `bson:"project"`
		Title       string             `bson:"title"`
		Description string             `bson:"description"`
	}
	if h.db.Collection("requirements").FindOne(ctx, bson.M{"_id": id}).Decode(&requirement) != nil {
		return
	}
	metadata := metadataFor(activity)
	putIfMissing(metadata, "title", requirement.Title)
	putIfMissing(metadata, "description", compactActivityText(requirement.Description))
	putIfMissing(metadata, "projectId", requirement.Project.Hex())
	h.addProjectName(ctx, metadata, requirement.Project)
}

func (h Handler) enrichBaselineActivity(ctx context.Context, activity *ActivityLog) {
	id, ok := entityObjectID(activity.EntityID)
	if !ok {
		return
	}
	var baseline struct {
		Project       primitive.ObjectID `bson:"project"`
		VersionNumber int                `bson:"versionNumber"`
	}
	if h.db.Collection("requirementversions").FindOne(ctx, bson.M{"_id": id}).Decode(&baseline) != nil {
		return
	}
	metadata := metadataFor(activity)
	putIfMissing(metadata, "projectId", baseline.Project.Hex())
	putIfMissing(metadata, "versionNumber", baseline.VersionNumber)
	h.addProjectName(ctx, metadata, baseline.Project)
}

func (h Handler) enrichDriftActivity(ctx context.Context, activity *ActivityLog) {
	id, ok := entityObjectID(activity.EntityID)
	if !ok {
		return
	}
	var analysis struct {
		Project    primitive.ObjectID `bson:"project"`
		InputText  string             `bson:"inputText"`
		Summary    string             `bson:"summary"`
		DriftScore int                `bson:"driftScore"`
		RiskLevel  string             `bson:"riskLevel"`
		InputType  string             `bson:"inputType"`
	}
	if h.db.Collection("driftanalyses").FindOne(ctx, bson.M{"_id": id}).Decode(&analysis) != nil {
		return
	}
	metadata := metadataFor(activity)
	putIfMissing(metadata, "projectId", analysis.Project.Hex())
	putIfMissing(metadata, "inputText", compactActivityText(analysis.InputText))
	putIfMissing(metadata, "summary", compactActivityText(analysis.Summary))
	putIfMissing(metadata, "driftScore", analysis.DriftScore)
	putIfMissing(metadata, "riskLevel", analysis.RiskLevel)
	putIfMissing(metadata, "inputType", analysis.InputType)
	h.addProjectName(ctx, metadata, analysis.Project)
}

func (h Handler) enrichChangeRequestActivity(ctx context.Context, activity *ActivityLog) {
	id, ok := entityObjectID(activity.EntityID)
	if !ok {
		return
	}
	var changeRequest struct {
		Project        primitive.ObjectID `bson:"project"`
		Title          string             `bson:"title"`
		Summary        string             `bson:"summary"`
		ApprovalStatus string             `bson:"approvalStatus"`
	}
	if h.db.Collection("changerequests").FindOne(ctx, bson.M{"_id": id}).Decode(&changeRequest) != nil {
		return
	}
	metadata := metadataFor(activity)
	putIfMissing(metadata, "projectId", changeRequest.Project.Hex())
	putIfMissing(metadata, "title", changeRequest.Title)
	putIfMissing(metadata, "summary", compactActivityText(changeRequest.Summary))
	putIfMissing(metadata, "approvalStatus", changeRequest.ApprovalStatus)
	h.addProjectName(ctx, metadata, changeRequest.Project)
}

func (h Handler) addProjectName(ctx context.Context, metadata bson.M, projectID primitive.ObjectID) {
	if _, exists := metadata["projectName"]; exists || projectID.IsZero() {
		return
	}
	var project struct {
		Name string `bson:"name"`
	}
	if h.db.Collection("projects").FindOne(ctx, bson.M{"_id": projectID}).Decode(&project) == nil && project.Name != "" {
		metadata["projectName"] = project.Name
	}
}

func metadataFor(activity *ActivityLog) bson.M {
	if activity.Metadata == nil {
		activity.Metadata = bson.M{}
	}
	return activity.Metadata
}

func entityObjectID(value string) (primitive.ObjectID, bool) {
	id, err := primitive.ObjectIDFromHex(value)
	return id, err == nil
}

func putIfMissing(metadata bson.M, key string, value any) {
	if _, exists := metadata[key]; exists {
		return
	}
	switch typed := value.(type) {
	case string:
		if typed != "" {
			metadata[key] = typed
		}
	case int:
		metadata[key] = typed
	default:
		if value != nil {
			metadata[key] = value
		}
	}
}

func compactActivityText(value string) string {
	text := strings.Join(strings.Fields(value), " ")
	if len(text) <= 120 {
		return text
	}
	return strings.TrimSpace(text[:117]) + "..."
}
