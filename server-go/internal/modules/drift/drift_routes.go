package drift

import (
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config) {
	handler := NewHandler(NewService(db, NewInferenceClient(cfg)))
	group.POST("/analyze-direct", handler.AnalyzeDirect)
	group.Use(middleware.Auth(db, cfg))
	group.POST("/analyze", handler.Analyze)
	group.POST("/save", handler.Save)
	group.GET("/project/:projectId", handler.List)
	group.GET("/:driftAnalysisId", handler.Get)
	group.DELETE("/:driftAnalysisId", handler.Delete)
}

func RegisterModelRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config) {
	handler := NewHandler(NewService(db, NewInferenceClient(cfg)))
	group.POST("/analyze", handler.AnalyzeModel)
}
