package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"driftledger/server-go/internal/config"
	"driftledger/server-go/internal/database"
	"driftledger/server-go/internal/ollama"
	"driftledger/server-go/internal/router"
	storageSvc "driftledger/server-go/internal/storage"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg := config.Load()
	mongoDB, err := database.Connect(cfg)
	if err != nil {
		logger.Error("mongo_connection_failed", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = mongoDB.Disconnect(ctx)
	}()

	storage := storageSvc.New(context.Background(), cfg)
	app := router.New(mongoDB.DB, cfg, ollama.New(cfg), storage)
	server := &http.Server{Addr: ":" + cfg.Port, Handler: app}

	go func() {
		logger.Info("api_listening", slog.String("url", "http://localhost:"+cfg.Port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server_failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
	logger.Info("api_shutdown_complete")
}
