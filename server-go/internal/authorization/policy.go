package authorization

import (
	"context"
	"errors"

	"driftledger/server-go/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ProjectAccess struct {
	ID        primitive.ObjectID `bson:"_id"`
	Workspace primitive.ObjectID `bson:"workspace"`
	Name      string             `bson:"name"`
	Client    string             `bson:"clientName"`
	Role      string             `bson:"-"`
}

type Capability string

const (
	CapabilityRead            Capability = "read"
	CapabilityWrite           Capability = "write"
	CapabilityApprove         Capability = "approve"
	CapabilityManageWorkspace Capability = "manage_workspace"
	CapabilityDeleteWorkspace Capability = "delete_workspace"
)

func RoleAllows(role string, capability Capability) bool {
	switch role {
	case "owner":
		return true
	case "admin":
		return capability != CapabilityDeleteWorkspace
	case "member":
		return capability == CapabilityRead || capability == CapabilityWrite
	case "viewer":
		return capability == CapabilityRead
	default:
		return false
	}
}

func HasWorkspaceAccess(ctx context.Context, db *mongo.Database, workspaceID, userID primitive.ObjectID) (bool, error) {
	_, err := WorkspaceRole(ctx, db, workspaceID, userID)
	if errors.Is(err, utils.ErrForbidden) {
		return false, nil
	}
	return err == nil, err
}

func RequireWorkspaceAccess(ctx context.Context, db *mongo.Database, workspaceID, userID primitive.ObjectID) error {
	return RequireWorkspaceCapability(ctx, db, workspaceID, userID, CapabilityRead)
}

func WorkspaceRole(ctx context.Context, db *mongo.Database, workspaceID, userID primitive.ObjectID) (string, error) {
	var member struct {
		Role string `bson:"role"`
	}
	err := db.Collection("workspacemembers").FindOne(ctx, bson.M{"workspace": workspaceID, "user": userID}).Decode(&member)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return "", utils.ErrForbidden
	}
	if err != nil {
		return "", err
	}
	if !RoleAllows(member.Role, CapabilityRead) {
		return "", utils.ErrForbidden
	}
	return member.Role, nil

}

func RequireWorkspaceCapability(ctx context.Context, db *mongo.Database, workspaceID, userID primitive.ObjectID, capability Capability) error {
	role, err := WorkspaceRole(ctx, db, workspaceID, userID)
	if err != nil {
		return err
	}
	if !RoleAllows(role, capability) {
		return utils.ErrForbidden
	}
	return nil
}

func RequireProjectAccess(ctx context.Context, db *mongo.Database, projectID, userID primitive.ObjectID) (ProjectAccess, error) {
	return RequireProjectCapability(ctx, db, projectID, userID, CapabilityRead)
}

func RequireProjectCapability(ctx context.Context, db *mongo.Database, projectID, userID primitive.ObjectID, capability Capability) (ProjectAccess, error) {
	var project ProjectAccess
	if err := db.Collection("projects").FindOne(ctx, bson.M{"_id": projectID}).Decode(&project); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return project, utils.ErrNotFound
		}
		return project, err
	}
	role, err := WorkspaceRole(ctx, db, project.Workspace, userID)
	if err != nil {
		return project, err
	}
	if !RoleAllows(role, capability) {
		return project, utils.ErrForbidden
	}
	project.Role = role
	return project, nil
}
