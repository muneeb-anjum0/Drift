package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/response"
	"driftledger/server-go/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const UserIDKey = "userId"
const userLookupTimeout = 5 * time.Second

func Auth(db *mongo.Database, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			response.Error(c, http.StatusUnauthorized, "Missing authorization token", nil)
			c.Abort()
			return
		}
		claims, err := utils.ParseJWT(strings.TrimPrefix(header, "Bearer "), cfg.JWTSecret)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "Invalid or expired token", nil)
			c.Abort()
			return
		}
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "Invalid token subject", nil)
			c.Abort()
			return
		}
		ctx, cancel := context.WithTimeout(c.Request.Context(), userLookupTimeout)
		defer cancel()
		count, err := db.Collection("users").CountDocuments(ctx, bson.M{"_id": userID})
		if err != nil || count == 0 {
			response.Error(c, http.StatusUnauthorized, "User no longer exists", nil)
			c.Abort()
			return
		}
		c.Set(UserIDKey, userID)
		c.Next()
	}
}

func CurrentUserID(c *gin.Context) primitive.ObjectID {
	value, _ := c.Get(UserIDKey)
	id, _ := value.(primitive.ObjectID)
	return id
}
