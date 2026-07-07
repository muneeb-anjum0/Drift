package change_request

import (
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/ollama"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config, ollamaService ollama.Service) {
	handler := NewHandler(NewService(db, ollamaService))
	group.Use(middleware.Auth(db, cfg))
	group.POST("/generate", handler.Generate)
	group.POST("", handler.Save)
	group.GET("/approvals", handler.ListApprovals)
	group.GET("/approvals/:changeRequestId", handler.Get)
	group.GET("/project/:projectId", handler.List)
	group.GET("/:changeRequestId", handler.Get)
	group.PATCH("/:changeRequestId", handler.Update)
	group.POST("/:changeRequestId/submit", handler.SubmitForApproval)
	group.POST("/:changeRequestId/approve", handler.Approve)
	group.POST("/:changeRequestId/reject", handler.Reject)
	group.POST("/:changeRequestId/needs-revision", handler.NeedsRevision)
	group.DELETE("/:changeRequestId", handler.Delete)
}
