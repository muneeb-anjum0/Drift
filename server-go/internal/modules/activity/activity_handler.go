package activity

import (
	"errors"
	"net/http"

	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/response"
	"driftledger/server-go/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Handler struct{ db *mongo.Database }

func NewHandler(db *mongo.Database) Handler { return Handler{db: db} }

func (h Handler) List(c *gin.Context) {
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	userID := middleware.CurrentUserID(c)
	memberCursor, err := h.db.Collection("workspacemembers").Find(ctx, bson.M{"user": userID})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Activities could not be fetched", nil)
		return
	}
	var members []struct {
		Workspace primitive.ObjectID `bson:"workspace"`
	}
	_ = memberCursor.All(ctx, &members)
	ids := make([]primitive.ObjectID, 0, len(members))
	for _, member := range members {
		ids = append(ids, member.Workspace)
	}
	h.listByFilter(c, bson.M{"workspace": bson.M{"$in": ids}})
}

func (h Handler) ListByWorkspace(c *gin.Context) {
	workspaceID, err := utils.ObjectID(c.Param("workspaceId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid workspace id", nil)
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	if err := utils.RequireWorkspaceAccess(ctx, h.db, workspaceID, middleware.CurrentUserID(c)); err != nil {
		status := http.StatusForbidden
		if errors.Is(err, utils.ErrNotFound) {
			status = http.StatusNotFound
		}
		response.Error(c, status, "You do not have access to this workspace", nil)
		return
	}
	h.listByFilter(c, bson.M{"workspace": workspaceID})
}

func (h Handler) listByFilter(c *gin.Context, filter bson.M) {
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	cursor, err := h.db.Collection("activitylogs").Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Activities could not be fetched", nil)
		return
	}
	var activities []ActivityLog
	_ = cursor.All(ctx, &activities)
	h.enrichActivities(ctx, activities)
	response.Success(c, http.StatusOK, "Activities fetched", gin.H{"activities": activities})
}
