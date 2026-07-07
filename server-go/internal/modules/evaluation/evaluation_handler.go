package evaluation

import (
	"errors"
	"net/http"

	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/response"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) Handler {
	return Handler{service: service}
}

func (h Handler) Summary(c *gin.Context) {
	summary, err := h.service.Summary(c.Request.Context(), middleware.CurrentUserID(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Could not read evaluation summary", []string{err.Error()})
		return
	}
	response.Success(c, http.StatusOK, "Evaluation summary fetched", gin.H{"summary": summary})
}

func (h Handler) Reports(c *gin.Context) {
	reports, err := h.service.Reports()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Could not list evaluation reports", []string{err.Error()})
		return
	}
	response.Success(c, http.StatusOK, "Evaluation reports fetched", gin.H{"reports": reports})
}

func (h Handler) Latest(c *gin.Context) {
	report, err := h.service.Latest()
	if errors.Is(err, ErrNoReports) {
		response.Error(c, http.StatusNotFound, "No evaluation reports found", nil)
		return
	}
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Could not read latest evaluation report", []string{err.Error()})
		return
	}
	response.Success(c, http.StatusOK, "Latest evaluation report fetched", gin.H{"report": report})
}
