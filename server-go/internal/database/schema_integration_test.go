package database

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestSchemaCompatibilityWithIsolatedMongo(t *testing.T) {
	uri := os.Getenv("MONGO_TEST_URI")
	if uri == "" {
		t.Skip("set MONGO_TEST_URI for isolated Mongo compatibility tests")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Fatal(err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = client.Disconnect(context.Background()) })

	newDB := func(t *testing.T) *mongo.Database {
		t.Helper()
		db := client.Database("drift_ivc_schema_" + primitive.NewObjectID().Hex())
		t.Cleanup(func() {
			cleanup, stop := context.WithTimeout(context.Background(), 10*time.Second)
			defer stop()
			_ = db.Drop(cleanup)
		})
		return db
	}

	t.Run("empty database provisions expected indexes", func(t *testing.T) {
		db := newDB(t)
		before, err := CheckIndexes(ctx, db)
		if err != nil || len(before.Missing) != len(expectedIndexes) {
			t.Fatalf("empty state: missing=%d err=%v", len(before.Missing), err)
		}
		if err := EnsureIndexes(ctx, db); err != nil {
			t.Fatal(err)
		}
		after, err := CheckIndexes(ctx, db)
		if err != nil || len(after.Missing) != 0 || len(after.Unexpected) != 0 {
			t.Fatalf("provisioned state: %#v err=%v", after, err)
		}
	})

	t.Run("compatible startup is idempotent and retains data", func(t *testing.T) {
		db := newDB(t)
		if err := EnsureIndexes(ctx, db); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Collection("users").InsertOne(ctx, bson.M{"email": "synthetic@example.test"}); err != nil {
			t.Fatal(err)
		}
		if err := EnsureIndexes(ctx, db); err != nil {
			t.Fatal(err)
		}
		count, err := db.Collection("users").CountDocuments(ctx, bson.M{"email": "synthetic@example.test"})
		if err != nil || count != 1 {
			t.Fatalf("compatible startup altered data: count=%d err=%v", count, err)
		}
	})

	t.Run("incompatible index fails before other changes", func(t *testing.T) {
		db := newDB(t)
		_, err := db.Collection("users").Indexes().CreateOne(ctx, mongo.IndexModel{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetName("email_1"), // deliberately not unique
		})
		if err != nil {
			t.Fatal(err)
		}
		if err := EnsureIndexes(ctx, db); err == nil || !strings.Contains(err.Error(), "incompatible index users.email_1") {
			t.Fatalf("expected clear incompatibility, got %v", err)
		}
		collections, err := db.ListCollectionNames(ctx, bson.D{})
		if err != nil || len(collections) != 1 || collections[0] != "users" {
			t.Fatalf("incompatible preflight changed collections: %v err=%v", collections, err)
		}
	})
}
