package router

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/middleware"
	"driftledger/server-go/internal/modules/activity"
	"driftledger/server-go/internal/modules/auth"
	"driftledger/server-go/internal/modules/billing"
	change_request "driftledger/server-go/internal/modules/change_request"
	"driftledger/server-go/internal/modules/drift"
	"driftledger/server-go/internal/modules/evaluation"
	filemodule "driftledger/server-go/internal/modules/file"
	"driftledger/server-go/internal/modules/project"
	"driftledger/server-go/internal/modules/requirement"
	"driftledger/server-go/internal/modules/workspace"
	"driftledger/server-go/internal/response"
	storageSvc "driftledger/server-go/internal/storage"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func New(db *mongo.Database, cfg config.Config, storage storageSvc.Backend) *gin.Engine {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	if cfg.AppEnv != "development" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	// Gin otherwise trusts every forwarding peer. Only explicitly configured
	// immediate peers may supply client-IP headers used by logs and rate limits.
	if err := r.SetTrustedProxies(cfg.TrustedProxyCIDRs); err != nil {
		panic("invalid TRUSTED_PROXY_CIDRS: " + err.Error())
	}
	r.MaxMultipartMemory = cfg.MaxUploadSizeMB << 20
	if cfg.AppEnv == "development" {
		r.Use(middleware.DevRequestLogger(), middleware.Recovery(), middleware.SecurityHeaders(), middleware.CORS(cfg))
	} else {
		r.Use(middleware.RequestLogger(logger), middleware.Recovery(), middleware.SecurityHeaders(), middleware.CORS(cfg))
	}
	r.GET("/health", func(c *gin.Context) {
		response.Success(c, http.StatusOK, "DriftLedger API is running", nil)
	})
	r.GET("/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := db.Client().Ping(ctx, nil); err != nil {
			response.Error(c, http.StatusServiceUnavailable, "DriftLedger API is not ready", nil)
			return
		}
		response.Success(c, http.StatusOK, "DriftLedger API is ready", nil)
	})
	api := r.Group("/api/v1")
	inferenceLimiter := middleware.NewRateLimiter(cfg.InferenceRateLimitRequests, cfg.RateLimitWindow)
	auth.RegisterRoutes(api.Group("/auth"), db, cfg)
	workspace.RegisterRoutes(api.Group("/workspaces"), db, cfg, storage)
	project.RegisterRoutes(api.Group("/projects"), db, cfg, storage)
	activity.RegisterRoutes(api.Group("/activities"), db, cfg)
	requirement.RegisterRoutes(api.Group("/requirements"), db, cfg)
	drift.RegisterRoutes(api.Group("/drift"), db, cfg, inferenceLimiter)
	change_request.RegisterRoutes(api.Group("/change-requests"), db, cfg)
	filemodule.RegisterRoutes(api.Group("/files"), db, cfg, storage)
	evaluation.RegisterRoutes(api.Group("/evaluation"), db, cfg, inferenceLimiter)
	billing.RegisterRoutes(api.Group("/billing"), db, cfg)
	drift.RegisterModelRoutes(r.Group("/api/drift"), db, cfg, inferenceLimiter)
	if cfg.AppEnv == "development" {
		api.GET("/debug/routes", func(c *gin.Context) {
			routes := make([]gin.H, 0, len(r.Routes()))
			for _, route := range r.Routes() {
				routes = append(routes, gin.H{"method": route.Method, "path": route.Path})
			}
			response.Success(c, http.StatusOK, "Routes fetched", gin.H{"routes": routes})
		})
	}
	r.NoRoute(func(c *gin.Context) {
		response.Error(c, http.StatusNotFound, "Route not found", nil)
	})
	return r
}
