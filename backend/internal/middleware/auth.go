package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"driftledger/backend/internal/config"
	"driftledger/backend/internal/response"
	"driftledger/backend/internal/utils"
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
		var token string
		if strings.HasPrefix(header, "Bearer ") {
			token = strings.TrimPrefix(header, "Bearer ")
		} else if header == "" {
			cookie, err := c.Request.Cookie(SessionCookie)
			if err == nil {
				token = cookie.Value
			}
		}
		if token == "" {
			response.Error(c, http.StatusUnauthorized, "Missing authorization token", nil)
			c.Abort()
			return
		}
		if header == "" && c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			if !allowedBrowserOrigin(cfg, c.GetHeader("Origin")) {
				response.Error(c, http.StatusForbidden, "Request origin is not allowed", nil)
				c.Abort()
				return
			}
		}
		claims, err := utils.ParseJWT(token, cfg.JWTSecret)
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
