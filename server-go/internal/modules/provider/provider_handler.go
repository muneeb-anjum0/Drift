package provider

import (
	"context"
	"errors"
	"net/http"
	"time"

	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/response"
	"driftledger/server-go/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Handler struct{ manager Manager }

func NewHandler(manager Manager) Handler { return Handler{manager: manager} }

func (h Handler) workspace(c *gin.Context) (primitive.ObjectID, bool) {
	id, err := ParseWorkspaceID(c.Param("workspaceId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid workspace id", nil)
		return primitive.NilObjectID, false
	}
	return id, true
}

func readInput(c *gin.Context) (WriteRequest, bool) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8<<10)
	var input WriteRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid provider configuration", nil)
		return WriteRequest{}, false
	}
	return input, true
}

func (h Handler) Get(c *gin.Context) {
	id, ok := h.workspace(c)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	metadata, err := h.manager.Metadata(ctx, id, middleware.CurrentUserID(c))
	if err != nil {
		providerError(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Analysis provider fetched", gin.H{"provider": metadata})
}

func (h Handler) Test(c *gin.Context) {
	id, ok := h.workspace(c)
	if !ok {
		return
	}
	input, ok := readInput(c)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 25*time.Second)
	defer cancel()
	if err := h.manager.Test(ctx, id, middleware.CurrentUserID(c), input); err != nil {
		providerError(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Provider connected", gin.H{"status": "connected"})
}

func (h Handler) Save(c *gin.Context) {
	id, ok := h.workspace(c)
	if !ok {
		return
	}
	input, ok := readInput(c)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 25*time.Second)
	defer cancel()
	metadata, err := h.manager.Save(ctx, id, middleware.CurrentUserID(c), input)
	if err != nil {
		providerError(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Analysis provider saved", gin.H{"provider": metadata})
}

func (h Handler) Delete(c *gin.Context) {
	id, ok := h.workspace(c)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	if err := h.manager.Remove(ctx, id, middleware.CurrentUserID(c)); err != nil {
		providerError(c, err)
		return
	}
	response.Success(c, http.StatusOK, "External provider removed; local mode selected", gin.H{"provider": Metadata{ProviderType: TypeLocal, DisplayName: "Local model"}})
}

func providerError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, utils.ErrForbidden):
		response.Error(c, http.StatusForbidden, "You do not have access to this workspace", nil)
	case errors.Is(err, ErrInvalidConfig), errors.Is(err, ErrEndpointRejected):
		response.Error(c, http.StatusBadRequest, "Invalid provider configuration", nil)
	case errors.Is(err, ErrMasterKeyUnavailable), errors.Is(err, ErrCredentialInvalid):
		response.Error(c, http.StatusServiceUnavailable, "External provider key service is unavailable", nil)
	case errors.Is(err, ErrProviderAuthentication):
		response.Error(c, http.StatusBadGateway, "Provider authentication failed", nil)
	case errors.Is(err, ErrProviderModel):
		response.Error(c, http.StatusBadGateway, "Selected provider model is unavailable", nil)
	case errors.Is(err, ErrProviderRateLimited):
		response.Error(c, http.StatusBadGateway, "Provider rate limit reached", nil)
	case errors.Is(err, ErrProviderInvalidResponse):
		response.Error(c, http.StatusBadGateway, "Provider returned an invalid response", nil)
	case errors.Is(err, context.DeadlineExceeded), errors.Is(err, ErrProviderTimedOut):
		response.Error(c, http.StatusGatewayTimeout, "Provider request timed out", nil)
	case errors.Is(err, ErrProviderUnavailable):
		response.Error(c, http.StatusBadGateway, "Provider is unavailable", nil)
	default:
		response.Error(c, http.StatusInternalServerError, "Provider request failed", nil)
	}
}
