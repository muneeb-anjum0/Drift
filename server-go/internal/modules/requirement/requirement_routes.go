package requirement

import (
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config) {
	handler := NewHandler(NewService(db))
	group.Use(middleware.Auth(db, cfg))
	group.GET("/project/:projectId", handler.ListByProject)
	group.POST("", handler.Create)
	group.POST("/extract", handler.Extract)
	group.POST("/baseline", handler.Baseline)
	group.GET("/versions/:projectId", handler.Versions)
	group.GET("/:requirementId", handler.Get)
	group.PATCH("/:requirementId", handler.Update)
	group.DELETE("/:requirementId", handler.Delete)
}
