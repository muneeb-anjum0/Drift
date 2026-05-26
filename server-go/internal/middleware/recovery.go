package middleware

import (
	"net/http"

	"driftledger/server-go/internal/response"
	"github.com/gin-gonic/gin"
)

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, _ any) {
		response.Error(c, http.StatusInternalServerError, "Unexpected server error", nil)
	})
}
