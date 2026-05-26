package project

import (
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
	var payload CreateProjectRequest
	if err := c.ShouldBindJSON(&payload); err != nil || h.validate.Struct(payload) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", []string{"workspaceId and name are required"})
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	project, err := h.service.Create(ctx, middleware.CurrentUserID(c), payload)
	if err != nil {
		h.error(c, err)
		return
	}
	response.Success(c, http.StatusCreated, "Project created", gin.H{"project": project})
}

func (h Handler) List(c *gin.Context) {
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	var workspaceID *primitive.ObjectID
	if raw := c.Query("workspaceId"); raw != "" {
		id, err := utils.ObjectID(raw)
		if err != nil {
			response.Error(c, http.StatusBadRequest, "Invalid workspace id", nil)
			return
		}
		workspaceID = &id
	}
	projects, err := h.service.List(ctx, middleware.CurrentUserID(c), workspaceID)
	if err != nil {
		h.error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Projects fetched", gin.H{"projects": projects})
}

func (h Handler) Get(c *gin.Context) {
	id, ok := parseProjectID(c)
	if !ok {
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	project, err := h.service.Get(ctx, id, middleware.CurrentUserID(c))
	if err != nil {
		h.error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Project fetched", gin.H{"project": project})
}

func (h Handler) Update(c *gin.Context) {
	id, ok := parseProjectID(c)
	if !ok {
		return
	}
	var payload UpdateProjectRequest
	_ = c.ShouldBindJSON(&payload)
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	project, err := h.service.Update(ctx, id, middleware.CurrentUserID(c), payload)
	if err != nil {
		h.error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Project updated", gin.H{"project": project})
}

func (h Handler) Delete(c *gin.Context) {
	id, ok := parseProjectID(c)
	if !ok {
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	if err := h.service.Delete(ctx, id, middleware.CurrentUserID(c)); err != nil {
		h.error(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Project deleted", gin.H{})
}

func parseProjectID(c *gin.Context) (primitive.ObjectID, bool) {
	id, err := utils.ObjectID(c.Param("projectId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid project id", nil)
		return primitive.NilObjectID, false
	}
	return id, true
}

func (h Handler) error(c *gin.Context, err error) {
	if errors.Is(err, utils.ErrInvalidID) {
		response.Error(c, http.StatusBadRequest, "Invalid id", nil)
		return
	}
	if errors.Is(err, utils.ErrNotFound) {
		response.Error(c, http.StatusNotFound, "Project not found", nil)
		return
	}
	if errors.Is(err, utils.ErrForbidden) {
		response.Error(c, http.StatusForbidden, "You do not have access to this project", nil)
		return
	}
	response.Error(c, http.StatusInternalServerError, "Project request failed", nil)
}
