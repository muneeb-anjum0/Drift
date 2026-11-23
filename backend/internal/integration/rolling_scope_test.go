package integration_test

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"driftledger/backend/internal/modules/requirement"
	"driftledger/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestApprovedChangeRollsComparisonScope(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	originalID := primitive.NewObjectID()
	items := make([]requirement.RequirementSnapshot, 20)
	for i := range items {
		items[i] = requirement.RequirementSnapshot{RequirementID: fmt.Sprintf("req-%d", i), Title: fmt.Sprintf("Feature %d", i), Description: "Agreed feature"}
	}
	if _, err := f.db.Collection("requirementversions").InsertOne(ctx, requirement.RequirementVersion{ID: originalID, Project: f.projectA, Workspace: f.workspaceA, VersionNumber: 1, RequirementsSnapshot: items}); err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Collection("projects").UpdateByID(ctx, f.projectA, bson.M{"$set": bson.M{"currentScopeVersion": originalID}}); err != nil {
		t.Fatal(err)
	}
	service := requirement.NewService(f.db)
	publish := func(base primitive.ObjectID, requestNumber int) requirement.RequirementVersion {
		t.Helper()
		analysisID := primitive.NewObjectID()
		requestID := primitive.NewObjectID()
		if _, err := f.db.Collection("driftanalyses").InsertOne(ctx, bson.M{"_id": analysisID, "project": f.projectA, "workspace": f.workspaceA, "baselineVersion": base}); err != nil {
			t.Fatal(err)
		}
		if _, err := f.db.Collection("changerequests").InsertOne(ctx, bson.M{"_id": requestID, "project": f.projectA, "workspace": f.workspaceA, "driftAnalysis": analysisID, "approvalStatus": "approved", "changesRequested": []any{bson.M{"title": fmt.Sprintf("New feature %d", requestNumber), "description": "Human decision", "proposedText": fmt.Sprintf("Deliver new feature %d", requestNumber), "changeType": "added"}}}); err != nil {
			t.Fatal(err)
		}
		payload := requirement.IncludeChangeRequest{ProjectID: f.projectA.Hex(), BaseVersionID: base.Hex(), ChangeRequestID: requestID.Hex()}
		if _, err := service.IncludeApproved(ctx, f.viewerA, payload); !errors.Is(err, utils.ErrForbidden) {
			t.Fatalf("viewer published scope: %v", err)
		}
		version, err := service.IncludeApproved(ctx, f.ownerA, payload)
		if err != nil {
			t.Fatal(err)
		}
		if repeat, err := service.IncludeApproved(ctx, f.ownerA, payload); err != nil || repeat.ID != version.ID {
			t.Fatalf("idempotent retry created another version: %v", err)
		}
		return version
	}
	first := publish(originalID, 1)
	if len(first.RequirementsSnapshot) != 21 {
		t.Fatalf("first scope has %d items", len(first.RequirementsSnapshot))
	}
	second := publish(first.ID, 2)
	if len(second.RequirementsSnapshot) != 22 {
		t.Fatalf("second scope has %d items", len(second.RequirementsSnapshot))
	}
	var original requirement.RequirementVersion
	if err := f.db.Collection("requirementversions").FindOne(ctx, bson.M{"_id": originalID}).Decode(&original); err != nil {
		t.Fatal(err)
	}
	if len(original.RequirementsSnapshot) != 20 {
		t.Fatal("original scope mutated")
	}
	var project struct {
		CurrentScopeVersion primitive.ObjectID `bson:"currentScopeVersion"`
	}
	if err := f.db.Collection("projects").FindOne(ctx, bson.M{"_id": f.projectA}).Decode(&project); err != nil || project.CurrentScopeVersion != second.ID {
		t.Fatalf("project pointer is not the newest accepted revision: %v", err)
	}
}
