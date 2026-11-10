package activity

import (
	"driftledger/backend/internal/config"
	"driftledger/backend/internal/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config) {
	handler := NewHandler(db)
	group.Use(middleware.Auth(db, cfg))
	group.GET("", handler.List)
	group.GET("/:workspaceId", handler.ListByWorkspace)
}
