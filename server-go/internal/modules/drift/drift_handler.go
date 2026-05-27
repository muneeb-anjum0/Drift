package drift

import (
	"context"
	"errors"
	"net/http"
	"time"

	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/response"
	"driftledger/server-go/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Handler struct {
	service  Service
	validate *validator.Validate
}

func NewHandler(service Service) Handler { return Handler{service: service, validate: validator.New()} }
func (h Handler) Analyze(c *gin.Context) {
	var p AnalyzeRequest
	if c.ShouldBindJSON(&p) != nil || h.validate.Struct(p) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", nil)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 35*time.Second)
	defer cancel()
	out, err := h.service.Analyze(ctx, middleware.CurrentUserID(c), p)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Drift analysis completed", gin.H{"analysis": out})
}
func (h Handler) Save(c *gin.Context) {
	var p SaveRequest
	if c.ShouldBindJSON(&p) != nil || h.validate.Struct(p) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", nil)
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	out, err := h.service.Save(ctx, middleware.CurrentUserID(c), p)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusCreated, "Drift analysis saved", gin.H{"analysis": out})
}
func (h Handler) List(c *gin.Context) {
	id, ok := parseID(c, "projectId")
	if !ok {
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	out, err := h.service.List(ctx, id, middleware.CurrentUserID(c))
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Drift analyses fetched", gin.H{"analyses": out})
}
func (h Handler) Get(c *gin.Context) {
	id, ok := parseID(c, "driftAnalysisId")
	if !ok {
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	out, err := h.service.Get(ctx, id, middleware.CurrentUserID(c))
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Drift analysis fetched", gin.H{"analysis": out})
}
func (h Handler) Delete(c *gin.Context) {
	id, ok := parseID(c, "driftAnalysisId")
	if !ok {
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	if err := h.service.Delete(ctx, id, middleware.CurrentUserID(c)); err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Drift analysis deleted", gin.H{})
}
func parseID(c *gin.Context, key string) (primitive.ObjectID, bool) {
	id, err := utils.ObjectID(c.Param(key))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid id", nil)
		return primitive.NilObjectID, false
	}
	return id, true
}
func (h Handler) err(c *gin.Context, err error) {
	if errors.Is(err, utils.ErrNotFound) {
		response.Error(c, http.StatusNotFound, "Resource not found", nil)
		return
	}
	if errors.Is(err, utils.ErrForbidden) {
		response.Error(c, http.StatusForbidden, "You do not have access to this resource", nil)
		return
	}
	response.Error(c, http.StatusInternalServerError, "Drift request failed", nil)
}
