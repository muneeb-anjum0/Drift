package project

import (
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config) {
	handler := NewHandler(NewService(db))
	group.Use(middleware.Auth(db, cfg))
	group.POST("", handler.Create)
	group.GET("", handler.List)
	group.GET("/:projectId", handler.Get)
	group.PATCH("/:projectId", handler.Update)
	group.DELETE("/:projectId", handler.Delete)
}
