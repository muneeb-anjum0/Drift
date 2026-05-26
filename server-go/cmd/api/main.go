package main

import (
	"context"
	"log"
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
	cfg := config.Load()
	mongoDB, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("mongo connection failed: %v", err)
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
		log.Printf("DriftLedger Go API listening on http://localhost:%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
