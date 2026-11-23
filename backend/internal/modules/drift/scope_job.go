package drift

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"driftledger/backend/internal/authorization"
	"driftledger/backend/internal/modules/provider"
	"driftledger/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const scopeJobLease = 5 * time.Minute

type ScopeJob struct {
	ID               primitive.ObjectID    `bson:"_id,omitempty" json:"id"`
	User             primitive.ObjectID    `bson:"user" json:"-"`
	Project          primitive.ObjectID    `bson:"project" json:"-"`
	Workspace        primitive.ObjectID    `bson:"workspace" json:"-"`
	Request          AnalyzeRequest        `bson:"request" json:"-"`
	ProviderType     string                `bson:"providerType" json:"providerType"`
	ModelName        string                `bson:"modelName" json:"modelName"`
	ProviderRevision time.Time             `bson:"providerRevision" json:"-"`
	Status           string                `bson:"status" json:"status"`
	Processed        int                   `bson:"processed" json:"processed"`
	Total            int                   `bson:"total" json:"total"`
	Pairs            []ScopePairAssessment `bson:"pairs" json:"-"`
	Summaries        []string              `bson:"summaries" json:"-"`
	Result           *AnalysisPreview      `bson:"result,omitempty" json:"result,omitempty"`
	PreviewID        string                `bson:"previewId,omitempty" json:"-"`
	Error            string                `bson:"error,omitempty" json:"error,omitempty"`
	LeaseUntil       time.Time             `bson:"leaseUntil" json:"-"`
	Attempts         int                   `bson:"attempts" json:"-"`
	CreatedAt        time.Time             `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time             `bson:"updatedAt" json:"updatedAt"`
}

func (s Service) StartScopeJob(ctx context.Context, userID primitive.ObjectID, p AnalyzeRequest) (ScopeJob, error) {
	projectID, err := utils.ObjectID(p.ProjectID)
	if err != nil {
		return ScopeJob{}, err
	}
	versionID, err := utils.ObjectID(p.BaselineVersionID)
	if err != nil {
		return ScopeJob{}, err
	}
	project, err := authorization.RequireProjectCapability(ctx, s.db, projectID, userID, authorization.CapabilityWrite)
	if err != nil {
		return ScopeJob{}, err
	}
	if project.CurrentScopeVersion != nil && *project.CurrentScopeVersion != versionID {
		return ScopeJob{}, ErrScopeRevisionStale
	}
	var version struct {
		RequirementsSnapshot []struct {
			RequirementID string `bson:"requirementId"`
		} `bson:"requirementsSnapshot"`
	}
	if err := s.db.Collection("requirementversions").FindOne(ctx, bson.M{"_id": versionID, "project": projectID, "workspace": project.Workspace}).Decode(&version); err != nil {
		return ScopeJob{}, err
	}
	if project.CurrentScopeVersion == nil {
		var latest struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := s.db.Collection("requirementversions").FindOne(ctx, bson.M{"project": projectID, "workspace": project.Workspace}, options.FindOne().SetSort(bson.D{{Key: "versionNumber", Value: -1}})).Decode(&latest); err != nil {
			return ScopeJob{}, err
		}
		if latest.ID != versionID {
			return ScopeJob{}, ErrScopeRevisionStale
		}
		updated, err := s.db.Collection("projects").UpdateOne(ctx, bson.M{"_id": projectID, "currentScopeVersion": bson.M{"$exists": false}}, bson.M{"$set": bson.M{"currentScopeVersion": versionID}})
		if err != nil {
			return ScopeJob{}, err
		}
		if updated.MatchedCount == 0 {
			return ScopeJob{}, ErrScopeRevisionStale
		}
	}
	if len(version.RequirementsSnapshot) == 0 {
		return ScopeJob{}, utils.ErrNotFound
	}
	if len(version.RequirementsSnapshot) > 500 {
		return ScopeJob{}, ErrScopeTooLarge
	}
	selected, err := s.forWorkspace(ctx, project.Workspace)
	if err != nil {
		return ScopeJob{}, err
	}
	if !selected.Enabled() {
		return ScopeJob{}, ErrInferenceUnavailable
	}
	revision, err := s.scopeProviderRevision(ctx, project.Workspace)
	if err != nil {
		return ScopeJob{}, err
	}
	now := time.Now().UTC()
	job := ScopeJob{ID: primitive.NewObjectID(), User: userID, Project: projectID, Workspace: project.Workspace, Request: p, ProviderType: selected.ProviderName(), ModelName: selected.ModelName(), ProviderRevision: revision, Status: "queued", Total: len(version.RequirementsSnapshot), Pairs: []ScopePairAssessment{}, CreatedAt: now, UpdatedAt: now}
	if _, err := s.db.Collection("scopejobs").InsertOne(ctx, job); err != nil {
		return ScopeJob{}, err
	}
	return job, nil
}

var ErrScopeTooLarge = errors.New("scope exceeds the supported 500-item analysis limit")

func (s Service) scopeProviderRevision(ctx context.Context, workspace primitive.ObjectID) (time.Time, error) {
	var record struct {
		UpdatedAt time.Time `bson:"updatedAt"`
	}
	err := s.db.Collection("workspaceproviderconfigs").FindOne(ctx, bson.M{"_id": workspace}).Decode(&record)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return time.Time{}, nil
	}
	return record.UpdatedAt, err
}

func (s Service) CancelScopeJob(ctx context.Context, userID, jobID primitive.ObjectID) error {
	job, err := s.GetScopeJob(ctx, userID, jobID)
	if err != nil {
		return err
	}
	if job.Status == "complete" || job.Status == "failed" {
		return nil
	}
	_, err = s.db.Collection("scopejobs").UpdateOne(ctx, bson.M{"_id": jobID, "user": userID, "status": bson.M{"$in": []string{"queued", "running"}}}, bson.M{"$set": bson.M{"status": "canceled", "updatedAt": time.Now().UTC()}})
	return err
}

func (s Service) GetScopeJob(ctx context.Context, userID, jobID primitive.ObjectID) (ScopeJob, error) {
	var job ScopeJob
	err := s.db.Collection("scopejobs").FindOne(ctx, bson.M{"_id": jobID, "user": userID}).Decode(&job)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return ScopeJob{}, utils.ErrNotFound
	}
	if err != nil {
		return ScopeJob{}, err
	}
	if _, err := authorization.RequireProjectCapability(ctx, s.db, job.Project, userID, authorization.CapabilityRead); err != nil {
		return ScopeJob{}, err
	}
	if job.Result != nil {
		job.Result.PreviewID = job.PreviewID
	}
	return job, nil
}

// One worker per API process claims jobs through Mongo. A crashed worker's
// lease expires; completed pair batches are then resumed from the same pinned
// request and immutable revision. No provider credentials enter the job record.
func (s Service) RunScopeJobs(ctx context.Context) {
	tick := time.NewTicker(2 * time.Second)
	defer tick.Stop()
	for {
		if ctx.Err() != nil {
			return
		}
		job, err := s.claimScopeJob(ctx)
		if err == nil {
			s.runScopeJob(ctx, job)
			continue
		}
		if !errors.Is(err, mongo.ErrNoDocuments) {
			slog.Error("scope_job_claim_failed", "error", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}

func (s Service) claimScopeJob(ctx context.Context) (ScopeJob, error) {
	now := time.Now().UTC()
	filter := bson.M{"$or": []bson.M{{"status": "queued"}, {"status": "running", "leaseUntil": bson.M{"$lt": now}}}}
	update := bson.M{"$set": bson.M{"status": "running", "leaseUntil": now.Add(scopeJobLease), "updatedAt": now}, "$inc": bson.M{"attempts": 1}}
	var job ScopeJob
	err := s.db.Collection("scopejobs").FindOneAndUpdate(ctx, filter, update, options.FindOneAndUpdate().SetSort(bson.D{{Key: "createdAt", Value: 1}}).SetReturnDocument(options.After)).Decode(&job)
	return job, err
}

func (s Service) runScopeJob(parent context.Context, job ScopeJob) {
	ctx, cancel := context.WithTimeout(parent, 90*time.Minute)
	defer cancel()
	selected, err := s.forWorkspace(ctx, job.Workspace)
	if err == nil && (selected.ProviderName() != job.ProviderType || selected.ModelName() != job.ModelName) {
		err = errors.New("analysis provider changed; compare again")
	}
	if err == nil {
		var revision time.Time
		revision, err = s.scopeProviderRevision(ctx, job.Workspace)
		if err == nil && !revision.Equal(job.ProviderRevision) {
			err = errors.New("analysis provider configuration changed; compare again")
		}
	}
	var result AnalysisPreview
	if err == nil {
		result, err = s.analyzeWithProgress(ctx, job.User, job.Request, job.Pairs, job.Summaries, func(pairs []ScopePairAssessment, summaries []string) error {
			revision, revisionErr := s.scopeProviderRevision(ctx, job.Workspace)
			if revisionErr != nil || !revision.Equal(job.ProviderRevision) {
				return errors.New("analysis provider configuration changed; compare again")
			}
			fields := bson.M{"leaseUntil": time.Now().UTC().Add(scopeJobLease), "updatedAt": time.Now().UTC()}
			if pairs != nil {
				fields["pairs"] = pairs
				fields["summaries"] = summaries
				fields["processed"] = len(pairs)
			}
			updated, updateErr := s.db.Collection("scopejobs").UpdateOne(ctx, bson.M{"_id": job.ID, "status": "running", "attempts": job.Attempts}, bson.M{"$set": fields})
			if updateErr != nil {
				return updateErr
			}
			if updated.MatchedCount != 1 {
				return errors.New("scope job lease lost")
			}
			return nil
		}, selected)
	}
	if parent.Err() != nil {
		return
	} // lease expiry permits recovery after shutdown
	writeCtx, writeCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer writeCancel()
	if err == nil {
		revision, revisionErr := s.scopeProviderRevision(writeCtx, job.Workspace)
		if revisionErr != nil || !revision.Equal(job.ProviderRevision) {
			err = errors.New("analysis provider configuration changed; compare again")
		}
	}
	if err != nil {
		if result.PreviewID != "" {
			_, _ = s.db.Collection("analysispreviews").DeleteOne(writeCtx, bson.M{"_id": result.PreviewID, "user": job.User})
		}
		slog.Warn("scope_job_failed", "jobId", job.ID.Hex(), "error", err)
		_, _ = s.db.Collection("scopejobs").UpdateOne(writeCtx, bson.M{"_id": job.ID, "status": "running", "attempts": job.Attempts}, bson.M{"$set": bson.M{"status": "failed", "error": publicScopeJobError(err), "updatedAt": time.Now().UTC()}})
		return
	}
	updated, updateErr := s.db.Collection("scopejobs").UpdateOne(writeCtx, bson.M{"_id": job.ID, "status": "running", "attempts": job.Attempts}, bson.M{"$set": bson.M{"status": "complete", "result": result, "previewId": result.PreviewID, "processed": job.Total, "pairs": []ScopePairAssessment{}, "updatedAt": time.Now().UTC()}})
	if updateErr != nil || updated.MatchedCount != 1 {
		_, _ = s.db.Collection("analysispreviews").DeleteOne(writeCtx, bson.M{"_id": result.PreviewID, "user": job.User})
	}
}

func publicScopeJobError(err error) string {
	suffix := " No partial result was saved."
	switch {
	case errors.Is(err, provider.ErrProviderTimedOut):
		return "The online provider took too long to answer. Retry the comparison or choose a faster model." + suffix
	case errors.Is(err, provider.ErrProviderRateLimited):
		return "The online provider rate limit was reached. Wait for the provider quota to reset, then retry." + suffix
	case errors.Is(err, provider.ErrProviderAuthentication):
		return "The online provider rejected the saved API key. Check it in workspace settings, then retry." + suffix
	case errors.Is(err, provider.ErrProviderModel):
		return "The online provider could not find the configured model. Check its model ID in workspace settings." + suffix
	case errors.Is(err, provider.ErrProviderRequestRejected):
		return "The online provider rejected this scope request. Check that the selected model supports JSON responses." + suffix
	case errors.Is(err, provider.ErrProviderUnavailable):
		return "The online provider did not respond successfully. Check its service status and retry." + suffix
	default:
		return "The model could not complete a verified comparison. Retry the request; no partial result was saved."
	}
}
