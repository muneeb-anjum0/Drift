package billing

import (
	"net/http"

	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/response"
	"driftledger/server-go/internal/utils"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) Handler {
	return Handler{service: service}
}

func (h Handler) Summary(c *gin.Context) {
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	summary, err := h.service.Summary(ctx, middleware.CurrentUserID(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Could not read billing summary", []string{err.Error()})
		return
	}
	response.Success(c, http.StatusOK, "Billing summary fetched", gin.H{"summary": summary})
}
