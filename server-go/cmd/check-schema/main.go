// Command check-schema verifies required Mongo indexes without dropping data.
// Provisioning is restricted to disposable drift_ivc_* databases.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"driftledger/server-go/internal/database"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func run() error {
	databaseName := flag.String("database", "", "drift_staging (read-only) or disposable drift_ivc_* database")
	provision := flag.Bool("provision", false, "create missing indexes in a disposable drift_ivc_* database")
	flag.Parse()
	if *databaseName != "drift_staging" && !strings.HasPrefix(*databaseName, "drift_ivc_") {
		return errors.New("database must be drift_staging or a disposable drift_ivc_* database")
	}
	if *provision && !strings.HasPrefix(*databaseName, "drift_ivc_") {
		return errors.New("provisioning is restricted to disposable drift_ivc_* databases")
	}
	uri := strings.TrimSpace(os.Getenv("MONGO_SCHEMA_URI"))
	if uri == "" {
		return errors.New("MONGO_SCHEMA_URI is required; never put credentials in command arguments")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return errors.New("Mongo connection failed")
	}
	defer client.Disconnect(context.Background())
	if err := client.Ping(ctx, nil); err != nil {
		return errors.New("Mongo ping failed")
	}
	db := client.Database(*databaseName)
	if *provision {
		if err := database.EnsureIndexes(ctx, db); err != nil {
			return fmt.Errorf("index provisioning failed: %w", err)
		}
	}
	report, err := database.CheckIndexes(ctx, db)
	if err != nil {
		return fmt.Errorf("index compatibility failed: %w", err)
	}
	status := "PASS"
	if len(report.Missing) != 0 {
		status = "MISSING"
	}
	result := struct {
		Status   string `json:"status"`
		Database string `json:"database"`
		database.IndexReport
	}{Status: status, Database: *databaseName, IndexReport: report}
	if err := json.NewEncoder(os.Stdout).Encode(result); err != nil {
		return err
	}
	if status != "PASS" {
		return errors.New("required indexes are missing; no data changed")
	}
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "SCHEMA_CHECK_FAIL:", err)
		os.Exit(1)
	}
}
