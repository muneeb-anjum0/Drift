package requirement

import (
	"context"
	"errors"
	"strings"
	"time"

	"driftledger/backend/internal/authorization"
	"driftledger/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var ErrScopeRevisionConflict = errors.New("scope changed; compare the request again")
var ErrScopeChangeNotApproved = errors.New("change request is not approved")
var ErrScopeChangeInvalid = errors.New("approved change cannot be applied to scope")

type IncludeChangeRequest struct {
	ProjectID       string `json:"projectId" validate:"required"`
	BaseVersionID   string `json:"baseVersionId" validate:"required"`
	ChangeRequestID string `json:"changeRequestId" validate:"required"`
}

type approvedScopeChange struct {
	Title                 string `bson:"title"`
	Description           string `bson:"description"`
	ProposedText          string `bson:"proposedText"`
	ChangeType            string `bson:"changeType"`
	BaselineRequirementID string `bson:"baselineRequirementId"`
}

type approvedScopeRequest struct {
	ID               primitive.ObjectID    `bson:"_id"`
	Project          primitive.ObjectID    `bson:"project"`
	Workspace        primitive.ObjectID    `bson:"workspace"`
	ApprovalStatus   string                `bson:"approvalStatus"`
	DriftAnalysis    primitive.ObjectID    `bson:"driftAnalysis"`
	ChangesRequested []approvedScopeChange `bson:"changesRequested"`
}

// projectScope applies only an explicitly approved request to an immutable
// snapshot. It never infers semantic changes or invents a baseline match.
func projectScope(base []RequirementSnapshot, changes []approvedScopeChange) ([]RequirementSnapshot, error) {
	out := append([]RequirementSnapshot(nil), base...)
	if len(changes) == 0 {
		return nil, ErrScopeChangeInvalid
	}
	for _, change := range changes {
		if strings.TrimSpace(change.Title) == "" || strings.TrimSpace(change.ProposedText) == "" {
			return nil, ErrScopeChangeInvalid
		}
		switch change.ChangeType {
		case "added":
			if change.BaselineRequirementID != "" {
				return nil, ErrScopeChangeInvalid
			}
			out = append(out, RequirementSnapshot{RequirementID: primitive.NewObjectID().Hex(), Title: change.Title, Description: change.ProposedText, Type: "functional", Priority: "medium", Status: "approved", Source: "client_message"})
		case "modified":
			if change.BaselineRequirementID == "" {
				return nil, ErrScopeChangeInvalid
			}
			found := false
			for i := range out {
				if out[i].RequirementID == change.BaselineRequirementID {
					out[i].Title = change.Title
					out[i].Description = change.ProposedText
					found = true
					break
				}
			}
			if !found {
				return nil, ErrScopeChangeInvalid
			}
		case "removed":
			if change.BaselineRequirementID == "" {
				return nil, ErrScopeChangeInvalid
			}
			found := false
			for i := range out {
				if out[i].RequirementID == change.BaselineRequirementID {
					out = append(out[:i], out[i+1:]...)
					found = true
					break
				}
			}
			if !found {
				return nil, ErrScopeChangeInvalid
			}
		default:
			return nil, ErrScopeChangeInvalid
		}
	}
	return out, nil
}

func (s Service) IncludeApproved(ctx context.Context, userID primitive.ObjectID, p IncludeChangeRequest) (RequirementVersion, error) {
	projectID, err := utils.ObjectID(p.ProjectID)
	if err != nil {
		return RequirementVersion{}, err
	}
	baseID, err := utils.ObjectID(p.BaseVersionID)
	if err != nil {
		return RequirementVersion{}, err
	}
	requestID, err := utils.ObjectID(p.ChangeRequestID)
	if err != nil {
		return RequirementVersion{}, err
	}
	project, err := authorization.RequireProjectCapability(ctx, s.db, projectID, userID, authorization.CapabilityApprove)
	if err != nil {
		return RequirementVersion{}, err
	}
	var base RequirementVersion
	if err = s.db.Collection("requirementversions").FindOne(ctx, bson.M{"_id": baseID, "project": projectID, "workspace": project.Workspace}).Decode(&base); err != nil {
		return RequirementVersion{}, err
	}
	var change approvedScopeRequest
	if err = s.db.Collection("changerequests").FindOne(ctx, bson.M{"_id": requestID, "project": projectID, "workspace": project.Workspace}).Decode(&change); err != nil {
		return RequirementVersion{}, err
	}
	if change.ApprovalStatus != "approved" {
		return RequirementVersion{}, ErrScopeChangeNotApproved
	}
	var analysis struct {
		BaselineVersion primitive.ObjectID `bson:"baselineVersion"`
	}
	if err = s.db.Collection("driftanalyses").FindOne(ctx, bson.M{"_id": change.DriftAnalysis, "project": projectID, "workspace": project.Workspace}).Decode(&analysis); err != nil {
		return RequirementVersion{}, err
	}
	if analysis.BaselineVersion != baseID {
		return RequirementVersion{}, ErrScopeRevisionConflict
	}
	var existing RequirementVersion
	if err = s.db.Collection("requirementversions").FindOne(ctx, bson.M{"project": projectID, "sourceChangeRequest": requestID}).Decode(&existing); err == nil {
		return existing, nil
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		return RequirementVersion{}, err
	}
	if project.CurrentScopeVersion == nil || *project.CurrentScopeVersion != baseID {
		return RequirementVersion{}, ErrScopeRevisionConflict
	}
	next, err := projectScope(base.RequirementsSnapshot, change.ChangesRequested)
	if err != nil {
		return RequirementVersion{}, err
	}
	now := time.Now().UTC()
	var counter struct {
		VersionNumber int `bson:"baselineVersionCounter"`
	}
	if err = s.db.Collection("projects").FindOneAndUpdate(ctx, bson.M{"_id": projectID}, bson.M{"$max": bson.M{"baselineVersionCounter": base.VersionNumber}}).Err(); err != nil {
		return RequirementVersion{}, err
	}
	if err = s.db.Collection("projects").FindOneAndUpdate(ctx, bson.M{"_id": projectID}, bson.M{"$inc": bson.M{"baselineVersionCounter": 1}}, options.FindOneAndUpdate().SetReturnDocument(options.After).SetProjection(bson.M{"baselineVersionCounter": 1})).Decode(&counter); err != nil {
		return RequirementVersion{}, err
	}
	version := RequirementVersion{ID: primitive.NewObjectID(), Project: projectID, Workspace: project.Workspace, VersionNumber: counter.VersionNumber, Label: "Accepted scope", Description: "Applied approved change request", RequirementsSnapshot: next, ParentVersion: &baseID, SourceChangeRequest: &requestID, CreatedBy: userID, CreatedAt: now}
	// In the supported standalone Mongo deployment, insertion precedes the
	// pointer CAS. Orphans are not current and are deleted on a lost race.
	if _, err = s.db.Collection("requirementversions").InsertOne(ctx, version); err != nil {
		return RequirementVersion{}, ErrScopeRevisionConflict
	}
	result, err := s.db.Collection("projects").UpdateOne(ctx, bson.M{"_id": projectID, "currentScopeVersion": baseID}, bson.M{"$set": bson.M{"currentScopeVersion": version.ID, "updatedAt": now}})
	if err != nil || result.MatchedCount != 1 {
		_, _ = s.db.Collection("requirementversions").DeleteOne(ctx, bson.M{"_id": version.ID})
		return RequirementVersion{}, ErrScopeRevisionConflict
	}
	return version, nil
}
