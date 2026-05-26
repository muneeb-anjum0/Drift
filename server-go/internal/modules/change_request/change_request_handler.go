package change_request

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
func (h Handler) Generate(c *gin.Context) {
	var p GenerateRequest
	if c.ShouldBindJSON(&p) != nil || h.validate.Struct(p) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", nil)
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	out, err := h.service.Generate(ctx, middleware.CurrentUserID(c), p)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Change request generated", gin.H{"changeRequest": out})
}
func (h Handler) Save(c *gin.Context) {
	var p SaveRequest
	if c.ShouldBindJSON(&p) != nil || p.DriftAnalysisID == "" {
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
	response.Success(c, http.StatusCreated, "Change request saved", gin.H{"changeRequest": out})
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
	response.Success(c, http.StatusOK, "Change requests fetched", gin.H{"changeRequests": out})
}
func (h Handler) Get(c *gin.Context) {
	id, ok := parseID(c, "changeRequestId")
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
	response.Success(c, http.StatusOK, "Change request fetched", gin.H{"changeRequest": out})
}
func (h Handler) Update(c *gin.Context) {
	id, ok := parseID(c, "changeRequestId")
	if !ok {
		return
	}
	var p UpdateRequest
	_ = c.ShouldBindJSON(&p)
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	out, err := h.service.Update(ctx, id, middleware.CurrentUserID(c), p)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Change request updated", gin.H{"changeRequest": out})
}
func (h Handler) Delete(c *gin.Context) {
	id, ok := parseID(c, "changeRequestId")
	if !ok {
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	if err := h.service.Delete(ctx, id, middleware.CurrentUserID(c)); err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Change request deleted", gin.H{})
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
	response.Error(c, http.StatusInternalServerError, "Change request failed", nil)
}
