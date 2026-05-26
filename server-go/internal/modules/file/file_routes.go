package file

import (
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	storageSvc "driftledger/server-go/internal/storage"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config, storage storageSvc.Service) {
	handler := NewHandler(NewService(db, storage, cfg))
	group.Use(middleware.Auth(db, cfg))
	group.POST("/upload", handler.Upload)
	group.GET("/project/:projectId", handler.List)
	group.GET("/:fileId", handler.Get)
	group.DELETE("/:fileId", handler.Delete)
}
