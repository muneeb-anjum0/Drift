package requirement

import (
	"errors"
	"net/http"

	"driftledger/backend/internal/middleware"
	"driftledger/backend/internal/requestctx"
	"driftledger/backend/internal/response"
	"driftledger/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Handler struct {
	service  Service
	validate *validator.Validate
}

func NewHandler(service Service) Handler { return Handler{service: service, validate: validator.New()} }

func (h Handler) ListByProject(c *gin.Context) {
	id, ok := parseIDParam(c, "projectId")
	if !ok {
		return
	}
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
	defer cancel()
	reqs, err := h.service.ListByProject(ctx, id, middleware.CurrentUserID(c))
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Requirements fetched", gin.H{"requirements": reqs})
}
func (h Handler) Get(c *gin.Context) {
	id, ok := parseIDParam(c, "requirementId")
	if !ok {
		return
	}
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
	defer cancel()
	req, err := h.service.Get(ctx, id, middleware.CurrentUserID(c))
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Requirement fetched", gin.H{"requirement": req})
}
func (h Handler) Create(c *gin.Context) {
	var p CreateRequirementRequest
	if c.ShouldBindJSON(&p) != nil || h.validate.Struct(p) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", []string{"projectId and title are required"})
		return
	}
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
	defer cancel()
	req, err := h.service.Create(ctx, middleware.CurrentUserID(c), p)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusCreated, "Requirement created", gin.H{"requirement": req})
}
func (h Handler) Update(c *gin.Context) {
	id, ok := parseIDParam(c, "requirementId")
	if !ok {
		return
	}
	var p UpdateRequirementRequest
	_ = c.ShouldBindJSON(&p)
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
	defer cancel()
	req, err := h.service.Update(ctx, id, middleware.CurrentUserID(c), p)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Requirement updated", gin.H{"requirement": req})
}
func (h Handler) Delete(c *gin.Context) {
	id, ok := parseIDParam(c, "requirementId")
	if !ok {
		return
	}
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
	defer cancel()
	if err := h.service.Delete(ctx, id, middleware.CurrentUserID(c)); err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Requirement deleted", gin.H{})
}
func (h Handler) Baseline(c *gin.Context) {
	var p BaselineRequest
	if c.ShouldBindJSON(&p) != nil || h.validate.Struct(p) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", nil)
		return
	}
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
	defer cancel()
	version, err := h.service.Baseline(ctx, middleware.CurrentUserID(c), p)
	if err != nil {
		if err.Error() == "empty baseline" {
			response.Error(c, http.StatusBadRequest, "Add requirements before creating a baseline", nil)
			return
		}
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusCreated, "Requirement baseline created", gin.H{"version": version})
}
func (h Handler) IncludeApproved(c *gin.Context) {
	var p IncludeChangeRequest
	if c.ShouldBindJSON(&p) != nil || h.validate.Struct(p) != nil {
		response.Error(c, http.StatusBadRequest, "Project, current scope revision, and approved change request are required", nil)
		return
	}
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
	defer cancel()
	version, err := h.service.IncludeApproved(ctx, middleware.CurrentUserID(c), p)
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusCreated, "Approved change included in comparison scope", gin.H{"version": version})
}
func (h Handler) Versions(c *gin.Context) {
	id, ok := parseIDParam(c, "projectId")
	if !ok {
		return
	}
	ctx, cancel := requestctx.WithTimeout(c.Request.Context())
	defer cancel()
	versions, err := h.service.Versions(ctx, id, middleware.CurrentUserID(c))
	if err != nil {
		h.err(c, err)
		return
	}
	response.Success(c, http.StatusOK, "Requirement versions fetched", gin.H{"versions": versions})
}

func parseIDParam(c *gin.Context, name string) (primitive.ObjectID, bool) {
	id, err := utils.ObjectID(c.Param(name))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid id", nil)
		return primitive.NilObjectID, false
	}
	return id, true
}
func (h Handler) err(c *gin.Context, err error) {
	if errors.Is(err, ErrScopeFrozen) {
		response.Error(c, http.StatusConflict, "The original scope is frozen. Submit and approve a change request to update the comparison scope.", nil)
		return
	}
	if errors.Is(err, ErrScopeRevisionConflict) {
		response.Error(c, http.StatusConflict, "Scope has changed. Compare this request against the current scope again.", nil)
		return
	}
	if errors.Is(err, ErrScopeChangeNotApproved) || errors.Is(err, ErrScopeChangeInvalid) {
		response.Error(c, http.StatusConflict, "This change request cannot be included in scope", nil)
		return
	}
	if errors.Is(err, utils.ErrInvalidID) {
		response.Error(c, http.StatusBadRequest, "Invalid id", nil)
		return
	}
	if errors.Is(err, utils.ErrNotFound) {
		response.Error(c, http.StatusNotFound, "Resource not found", nil)
		return
	}
	if errors.Is(err, utils.ErrForbidden) {
		response.Error(c, http.StatusForbidden, "You do not have access to this resource", nil)
		return
	}
	response.Error(c, http.StatusInternalServerError, "Requirement request failed", nil)
}
