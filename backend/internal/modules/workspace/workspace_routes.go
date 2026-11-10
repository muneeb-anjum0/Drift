package workspace

import (
	"driftledger/backend/internal/config"
	"driftledger/backend/internal/middleware"
	storageSvc "driftledger/backend/internal/storage"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config, storage storageSvc.Backend) {
	handler := NewHandler(NewService(db, storage))
	group.Use(middleware.Auth(db, cfg))
	group.POST("", handler.Create)
	group.GET("", handler.List)
	group.GET("/:workspaceId", handler.Get)
	group.PATCH("/:workspaceId", handler.Update)
	group.DELETE("/:workspaceId", handler.Delete)
}
