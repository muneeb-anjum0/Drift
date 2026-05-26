package file

import (
	"errors"
	"net/http"

	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/response"
	storageSvc "driftledger/server-go/internal/storage"
	"driftledger/server-go/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Handler struct{ service Service }

func NewHandler(service Service) Handler { return Handler{service: service} }
func (h Handler) Upload(c *gin.Context) {
	rawProjectID := c.PostForm("projectId")
	projectID, err := utils.ObjectID(rawProjectID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid project id", nil)
		return
	}
	header, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "File is required", nil)
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	doc, err := h.service.Upload(ctx, middleware.CurrentUserID(c), projectID, c.PostForm("documentType"), header)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusCreated, "File uploaded", gin.H{"file": doc})
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
	response.Success(c, http.StatusOK, "Files fetched", gin.H{"files": out})
}
func (h Handler) Get(c *gin.Context) {
	id, ok := parseID(c, "fileId")
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
	response.Success(c, http.StatusOK, "File fetched", gin.H{"file": out})
}
func (h Handler) Delete(c *gin.Context) {
	id, ok := parseID(c, "fileId")
	if !ok {
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	if err := h.service.Delete(ctx, id, middleware.CurrentUserID(c)); err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "File deleted", gin.H{})
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
	if errors.Is(err, storageSvc.ErrDisabled) {
		response.Error(c, http.StatusServiceUnavailable, storageSvc.ErrDisabled.Error(), nil)
		return
	}
	if errors.Is(err, utils.ErrNotFound) {
		response.Error(c, http.StatusNotFound, "File not found", nil)
		return
	}
	if errors.Is(err, utils.ErrForbidden) {
		response.Error(c, http.StatusForbidden, "You do not have access to this file", nil)
		return
	}
	response.Error(c, http.StatusInternalServerError, err.Error(), nil)
}
