package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Service struct {
	db  *mongo.Database
	cfg config.Config
}

func NewService(db *mongo.Database, cfg config.Config) Service {
	return Service{db: db, cfg: cfg}
}

func (s Service) Register(ctx context.Context, payload RegisterRequest) (User, string, error) {
	email := strings.ToLower(strings.TrimSpace(payload.Email))
	count, err := s.db.Collection("users").CountDocuments(ctx, bson.M{"email": email})
	if err != nil {
		return User{}, "", err
	}
	if count > 0 {
		return User{}, "", ErrDuplicateEmail
	}
	hash, err := utils.HashPassword(payload.Password)
	if err != nil {
		return User{}, "", err
	}
	now := time.Now().UTC()
	user := User{ID: utils.NewID(), Name: strings.TrimSpace(payload.Name), Email: email, PasswordHash: hash, Avatar: "", IsEmailVerified: false, CreatedAt: now, UpdatedAt: now}
	if _, err := s.db.Collection("users").InsertOne(ctx, user); err != nil {
		return User{}, "", err
	}
	workspaceID := utils.NewID()
	workspace := bson.M{"_id": workspaceID, "name": fmt.Sprintf("%s's Workspace", user.Name), "slug": fmt.Sprintf("%s-%s", utils.Slug(user.Name), workspaceID.Hex()[18:]), "owner": user.ID, "createdBy": user.ID, "description": "Default workspace", "createdAt": now, "updatedAt": now}
	member := bson.M{"_id": utils.NewID(), "workspace": workspaceID, "user": user.ID, "role": "owner", "createdAt": now, "updatedAt": now}
	if _, err := s.db.Collection("workspaces").InsertOne(ctx, workspace); err != nil {
		_, _ = s.db.Collection("users").DeleteOne(ctx, bson.M{"_id": user.ID})
		return User{}, "", err
	}
	if _, err := s.db.Collection("workspacemembers").InsertOne(ctx, member); err != nil {
		_, _ = s.db.Collection("users").DeleteOne(ctx, bson.M{"_id": user.ID})
		_, _ = s.db.Collection("workspaces").DeleteOne(ctx, bson.M{"_id": workspaceID})
		return User{}, "", err
	}
	_, _ = s.db.Collection("activitylogs").InsertOne(ctx, bson.M{"_id": utils.NewID(), "workspace": workspaceID, "user": user.ID, "action": "USER_REGISTERED", "entityType": "User", "entityId": user.ID.Hex(), "metadata": bson.M{"email": email}, "createdAt": now})
	token, err := utils.SignJWT(user.ID, user.Email, s.cfg.JWTSecret, s.cfg.JWTExpiresInHours)
	return user, token, err
}

func (s Service) Login(ctx context.Context, payload LoginRequest) (User, string, error) {
	email := strings.ToLower(strings.TrimSpace(payload.Email))
	var user User
	if err := s.db.Collection("users").FindOne(ctx, bson.M{"email": email}).Decode(&user); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return User{}, "", ErrInvalidCredentials
		}
		return User{}, "", err
	}
	if user.PasswordHash == "" || !utils.CheckPassword(user.PasswordHash, payload.Password) {
		return User{}, "", ErrInvalidCredentials
	}
	token, err := utils.SignJWT(user.ID, user.Email, s.cfg.JWTSecret, s.cfg.JWTExpiresInHours)
	return user, token, err
}

func (s Service) Me(ctx context.Context, userID primitive.ObjectID) (User, error) {
	var user User
	err := s.db.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	return user, err
}

var (
	ErrDuplicateEmail     = errors.New("duplicate email")
	ErrInvalidCredentials = errors.New("invalid credentials")
)
