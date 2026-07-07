package evaluation

import (
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(r *gin.RouterGroup, db *mongo.Database, cfg config.Config) {
	handler := NewHandler(NewService(db))
	protected := r.Group("", middleware.Auth(db, cfg))
	protected.GET("/summary", handler.Summary)
	protected.GET("/reports", handler.Reports)
	protected.GET("/reports/latest", handler.Latest)
}
