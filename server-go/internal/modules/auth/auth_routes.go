package auth

import (
	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoutes(group *gin.RouterGroup, db *mongo.Database, cfg config.Config) {
	handler := NewHandler(NewService(db, cfg))
	group.POST("/register", handler.Register)
	group.POST("/login", handler.Login)
	protected := group.Group("")
	protected.Use(middleware.Auth(db, cfg))
	protected.GET("/me", handler.Me)
	protected.POST("/logout", handler.Logout)
}
