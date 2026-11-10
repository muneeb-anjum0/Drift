package file

import (
	"driftledger/backend/internal/config"
	"driftledger/backend/internal/middleware"
	storageSvc "driftledger/backend/internal/storage"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config, storage storageSvc.Backend) {
	handler := NewHandler(NewService(db, storage, cfg))
	group.Use(middleware.Auth(db, cfg))
	group.GET("/capabilities", handler.Capabilities)
	group.POST("/upload", handler.Upload)
	group.GET("/project/:projectId", handler.List)
	group.GET("/:fileId", handler.Get)
	group.DELETE("/:fileId", handler.Delete)
}
