package drift

import (
	"context"
	"errors"
	"net/http"
	"time"

	"driftledger/server-go/internal/authorization"
	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/modules/provider"
	"driftledger/server-go/internal/requestctx"
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

func (h Handler) Readiness(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()
	selected := h.service.inference
	if raw := c.Query("workspaceId"); raw != "" {
		workspace, err := utils.ObjectID(raw)
		if err != nil {
			response.Error(c, http.StatusBadRequest, "Invalid workspace id", nil)
			return
		}
		if err := authorization.RequireWorkspaceCapability(ctx, h.service.db, workspace, middleware.CurrentUserID(c), authorization.CapabilityRead); err != nil {
			h.err(c, err)
			return
		}
		selected, err = h.service.forWorkspace(ctx, workspace)
		if err != nil {
			response.Success(c, http.StatusOK, "Change analysis readiness checked", gin.H{"available": false, "reason": "unavailable", "providerType": provider.TypeExternal})
			return
		}
	}
	available := selected.Enabled() && selected.Health(ctx) == nil
	reason := "ready"
	if !available {
		reason = "unavailable"
		if !selected.Enabled() {
			reason = "disabled"
		}
	}
	response.Success(c, http.StatusOK, "Change analysis readiness checked", gin.H{"available": available, "reason": reason, "providerType": selected.ProviderName(), "model": selected.ModelName()})
}

func (h Handler) AnalyzeDirect(c *gin.Context) {
	var p ModelAnalyzeRequest
	if c.ShouldBindJSON(&p) != nil || h.validate.Struct(p) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", nil)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 70*time.Second)
	defer cancel()
	out, err := h.service.AnalyzeDirect(ctx, p)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Drift model analysis completed", gin.H{"prediction": out})
}

func (h Handler) AnalyzeModel(c *gin.Context) {
	var p ModelAnalyzeRequest
	if c.ShouldBindJSON(&p) != nil || h.validate.Struct(p) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", nil)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 70*time.Second)
	defer cancel()
	out, err := h.service.AnalyzeDirect(ctx, p)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Drift model analysis completed", gin.H{
		"label":            out.Label,
		"confidence":       out.Confidence,
		"reasoning":        out.Reasoning,
		"changed_elements": out.ChangedElements,
	})
}

func (h Handler) Analyze(c *gin.Context) {
	var p AnalyzeRequest
	if c.ShouldBindJSON(&p) != nil || h.validate.Struct(p) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", nil)
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 120*time.Second)
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
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
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
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
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
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
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
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
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
	if errors.Is(err, ErrInferenceUnavailable) {
		response.Error(c, http.StatusBadGateway, "Drift inference service is unavailable", nil)
		return
	}
	if errors.Is(err, ErrInferenceBadResponse) {
		response.Error(c, http.StatusBadGateway, "Drift inference service returned an invalid response", nil)
		return
	}
	if errors.Is(err, provider.ErrMasterKeyUnavailable) || errors.Is(err, provider.ErrCredentialInvalid) {
		response.Error(c, http.StatusServiceUnavailable, "External provider key service is unavailable", nil)
		return
	}
	if errors.Is(err, provider.ErrProviderAuthentication) {
		response.Error(c, http.StatusBadGateway, "Provider authentication failed", nil)
		return
	}
	if errors.Is(err, provider.ErrProviderModel) {
		response.Error(c, http.StatusBadGateway, "Selected provider model is unavailable", nil)
		return
	}
	if errors.Is(err, provider.ErrProviderRateLimited) {
		response.Error(c, http.StatusBadGateway, "Provider rate limit reached", nil)
		return
	}
	if errors.Is(err, provider.ErrProviderInvalidResponse) {
		response.Error(c, http.StatusBadGateway, "Provider returned an invalid response", nil)
		return
	}
	if errors.Is(err, provider.ErrProviderTimedOut) {
		response.Error(c, http.StatusGatewayTimeout, "Provider request timed out", nil)
		return
	}
	if errors.Is(err, provider.ErrProviderUnavailable) || errors.Is(err, provider.ErrEndpointRejected) {
		response.Error(c, http.StatusBadGateway, "Provider is unavailable", nil)
		return
	}
	response.Error(c, http.StatusInternalServerError, "Drift request failed", nil)
}
