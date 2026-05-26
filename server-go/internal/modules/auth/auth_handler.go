package auth

import (
	"errors"
	"net/http"

	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/response"
	"driftledger/server-go/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type Handler struct {
	service  Service
	validate *validator.Validate
}

func NewHandler(service Service) Handler {
	return Handler{service: service, validate: validator.New()}
}

func (h Handler) Register(c *gin.Context) {
	var payload RegisterRequest
	if err := c.ShouldBindJSON(&payload); err != nil || h.validate.Struct(payload) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", []string{"name, email and password are required"})
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	user, token, err := h.service.Register(ctx, payload)
	if errors.Is(err, ErrDuplicateEmail) {
		response.Error(c, http.StatusConflict, "Email already registered", nil)
		return
	}
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Registration failed", nil)
		return
	}
	response.Success(c, http.StatusCreated, "Registration successful", gin.H{"user": user, "token": token})
}

func (h Handler) Login(c *gin.Context) {
	var payload LoginRequest
	if err := c.ShouldBindJSON(&payload); err != nil || h.validate.Struct(payload) != nil {
		response.Error(c, http.StatusBadRequest, "Validation failed", []string{"email and password are required"})
		return
	}
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	user, token, err := h.service.Login(ctx, payload)
	if errors.Is(err, ErrInvalidCredentials) {
		response.Error(c, http.StatusUnauthorized, "Invalid email or password", nil)
		return
	}
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Login failed", nil)
		return
	}
	response.Success(c, http.StatusOK, "Login successful", gin.H{"user": user, "token": token})
}

func (h Handler) Me(c *gin.Context) {
	ctx, cancel := utils.Context(c.Request.Context())
	defer cancel()
	user, err := h.service.Me(ctx, middleware.CurrentUserID(c))
	if err != nil {
		response.Error(c, http.StatusNotFound, "User not found", nil)
		return
	}
	response.Success(c, http.StatusOK, "Current user fetched", gin.H{"user": user})
}

func (h Handler) Logout(c *gin.Context) {
	response.Success(c, http.StatusOK, "Logout successful", gin.H{})
}
