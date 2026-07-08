package evaluation

import (
	"context"
	"errors"
	"net/http"
	"time"

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

func (h Handler) StartRun(c *gin.Context) {
	userID := middleware.CurrentUserID(c)
	if run := currentRun(userID); run != nil && (run.Status == runStatusQueued || run.Status == runStatusRunning) {
		response.Success(c, http.StatusOK, "Evaluation run already in progress", gin.H{"run": run})
		return
	}
	run := startRun(userID, len(benchmarkCases))
	go func() {
		ctx, cancel := contextWithEvaluationTimeout()
		defer cancel()
		h.service.RunEvaluation(ctx, userID, run.ID)
	}()
	response.Success(c, http.StatusAccepted, "Evaluation run started", gin.H{"run": run})
}

func (h Handler) CurrentRun(c *gin.Context) {
	run := currentRun(middleware.CurrentUserID(c))
	response.Success(c, http.StatusOK, "Evaluation run fetched", gin.H{"run": run})
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

func contextWithEvaluationTimeout() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 30*time.Minute)
}
