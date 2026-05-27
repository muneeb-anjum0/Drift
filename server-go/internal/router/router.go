package router

import (
	"log/slog"
	"net/http"
	"os"

	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/modules/activity"
	"driftledger/server-go/internal/modules/auth"
	change_request "driftledger/server-go/internal/modules/change_request"
	"driftledger/server-go/internal/modules/drift"
	filemodule "driftledger/server-go/internal/modules/file"
	"driftledger/server-go/internal/modules/project"
	"driftledger/server-go/internal/modules/requirement"
	"driftledger/server-go/internal/modules/workspace"
	"driftledger/server-go/internal/ollama"
	"driftledger/server-go/internal/response"
	storageSvc "driftledger/server-go/internal/storage"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func New(db *mongo.Database, cfg config.Config, ollamaService ollama.Service, storage storageSvc.Service) *gin.Engine {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	if cfg.AppEnv != "development" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	if cfg.AppEnv == "development" {
		r.Use(middleware.DevRequestLogger(), middleware.Recovery(), middleware.CORS(cfg))
	} else {
		r.Use(middleware.RequestLogger(logger), middleware.Recovery(), middleware.CORS(cfg))
	}
	r.GET("/health", func(c *gin.Context) {
		response.Success(c, http.StatusOK, "DriftLedger API is running", nil)
	})
	api := r.Group("/api/v1")
	auth.RegisterRoutes(api.Group("/auth"), db, cfg)
	workspace.RegisterRoutes(api.Group("/workspaces"), db, cfg)
	project.RegisterRoutes(api.Group("/projects"), db, cfg)
	activity.RegisterRoutes(api.Group("/activities"), db, cfg)
	requirement.RegisterRoutes(api.Group("/requirements"), db, cfg)
	drift.RegisterRoutes(api.Group("/drift"), db, cfg, ollamaService)
	change_request.RegisterRoutes(api.Group("/change-requests"), db, cfg, ollamaService)
	filemodule.RegisterRoutes(api.Group("/files"), db, cfg, storage)
	r.NoRoute(func(c *gin.Context) {
		response.Error(c, http.StatusNotFound, "Route not found", nil)
	})
	return r
}
