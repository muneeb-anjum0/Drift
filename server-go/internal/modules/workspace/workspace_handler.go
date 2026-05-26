package workspace

import (
	"context"
	"errors"
	"net/http"

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

func (h Handler) Create(c *gin.Context) {
	var payload CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&payload); err != nil || h.validate.Struct(payload) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", []string{"name is required"})
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	ws, err := h.service.Create(ctx, middleware.CurrentUserID(c), payload)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Workspace could not be created", nil)
		return
	}
	response.Success(c, http.StatusCreated, "Workspace created", gin.H{"workspace": ws})
}

func (h Handler) List(c *gin.Context) {
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	workspaces, err := h.service.List(ctx, middleware.CurrentUserID(c))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Workspaces could not be fetched", nil)
		return
	}
	response.Success(c, http.StatusOK, "Workspaces fetched", gin.H{"workspaces": workspaces})
}

func (h Handler) Get(c *gin.Context) {
	h.withID(c, func(ctxID idCtx) {
		ws, err := h.service.Get(ctxID.ctx, ctxID.id, ctxID.userID)
		respondWorkspace(c, ws, err, "Workspace fetched")
	})
}

func (h Handler) Update(c *gin.Context) {
	var payload UpdateWorkspaceRequest
	_ = c.ShouldBindJSON(&payload)
	h.withID(c, func(ctxID idCtx) {
		ws, err := h.service.Update(ctxID.ctx, ctxID.id, ctxID.userID, payload)
		respondWorkspace(c, ws, err, "Workspace updated")
	})
}

func (h Handler) Delete(c *gin.Context) {
	h.withID(c, func(ctxID idCtx) {
		err := h.service.Delete(ctxID.ctx, ctxID.id, ctxID.userID)
		if err != nil {
			respondWorkspace(c, Workspace{}, err, "")
			return
		}
		response.Success(c, http.StatusOK, "Workspace deleted", gin.H{})
	})
}

type idCtx struct {
	ctx    context.Context
	id     primitive.ObjectID
	userID primitive.ObjectID
}

func (h Handler) withID(c *gin.Context, fn func(idCtx)) {
	id, err := utils.ObjectID(c.Param("workspaceId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid workspace id", nil)
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	fn(idCtx{ctx: ctx, id: id, userID: middleware.CurrentUserID(c)})
}

func respondWorkspace(c *gin.Context, ws Workspace, err error, message string) {
	if errors.Is(err, utils.ErrNotFound) {
		response.Error(c, http.StatusNotFound, "Workspace not found", nil)
		return
	}
	if errors.Is(err, utils.ErrForbidden) {
		response.Error(c, http.StatusForbidden, "You do not have access to this workspace", nil)
		return
	}
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Workspace request failed", nil)
		return
	}
	response.Success(c, http.StatusOK, message, gin.H{"workspace": ws})
}
