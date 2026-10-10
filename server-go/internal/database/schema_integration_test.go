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

	for _, tc := range []struct {
		name       string
		collection string
		model      mongo.IndexModel
		want       string
		partial    bool
	}{
		{
			name: "wrong unique", collection: "users", want: "wrong unique setting",
			model: mongo.IndexModel{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetName("email_1")},
		},
		{
			name: "partial unique email", collection: "users", want: "partialFilterExpression", partial: true,
			model: mongo.IndexModel{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetName("email_1").SetUnique(true).SetPartialFilterExpression(bson.D{{Key: "email", Value: bson.D{{Key: "$exists", Value: true}}}})},
		},
		{
			name: "custom collation", collection: "users", want: "collation",
			model: mongo.IndexModel{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetName("email_1").SetUnique(true).SetCollation(&options.Collation{Locale: "en", Strength: 2})},
		},
		{
			name: "sparse", collection: "users", want: "sparse",
			model: mongo.IndexModel{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetName("email_1").SetUnique(true).SetSparse(true)},
		},
		{
			name: "TTL", collection: "workspacemembers", want: "expireAfterSeconds",
			model: mongo.IndexModel{Keys: bson.D{{Key: "user", Value: 1}}, Options: options.Index().SetName("user_1").SetExpireAfterSeconds(60)},
		},
		{
			name: "hidden", collection: "users", want: "hidden",
			model: mongo.IndexModel{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetName("email_1").SetUnique(true).SetHidden(true)},
		},
		{
			name: "wrong compound key order", collection: "workspacemembers", want: "ordered keys",
			model: mongo.IndexModel{Keys: bson.D{{Key: "user", Value: 1}, {Key: "workspace", Value: 1}}, Options: options.Index().SetName("workspace_1_user_1").SetUnique(true)},
		},
		{
			name: "wrong key direction", collection: "workspacemembers", want: "ordered keys",
			model: mongo.IndexModel{Keys: bson.D{{Key: "workspace", Value: -1}, {Key: "user", Value: 1}}, Options: options.Index().SetName("workspace_1_user_1").SetUnique(true)},
		},
		{
			name: "same keys wrong name", collection: "users", want: "wrong name",
			model: mongo.IndexModel{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetName("other_email_1").SetUnique(true)},
		},
	} {
		t.Run(tc.name+" fails before unrelated provisioning", func(t *testing.T) {
			db := newDB(t)
			if _, err := db.Collection(tc.collection).Indexes().CreateOne(ctx, tc.model); err != nil {
				t.Fatal(err)
			}
			if tc.partial {
				if _, err := db.Collection("users").InsertMany(ctx, []any{bson.M{"_id": "synthetic-a"}, bson.M{"_id": "synthetic-b"}}); err != nil {
					t.Fatal(err)
				}
				count, err := db.Collection("users").CountDocuments(ctx, bson.M{"email": bson.M{"$exists": false}})
				if err != nil || count != 2 {
					t.Fatalf("partial index semantic reproduction: missing-email count=%d err=%v", count, err)
				}
			}
			if _, err := CheckIndexes(ctx, db); err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("expected %q incompatibility from read-only check, got %v", tc.want, err)
			}
			if err := EnsureIndexes(ctx, db); err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("expected %q incompatibility before provisioning, got %v", tc.want, err)
			}
			collections, err := db.ListCollectionNames(ctx, bson.D{})
			if err != nil || len(collections) != 1 || collections[0] != tc.collection {
				t.Fatalf("incompatible preflight changed collections: %v err=%v", collections, err)
			}
		})
	}
}

func TestIndexMetadataNormalization(t *testing.T) {
	expected := expectedIndexes[2] // non-unique workspacemembers.user_1
	keys, err := bson.Marshal(expected.keys)
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name   string
		fields bson.D
		want   string
	}{
		{"absent default options", bson.D{{Key: "v", Value: 2}, {Key: "key", Value: expected.keys}, {Key: "name", Value: expected.name}}, ""},
		{"explicit false defaults", bson.D{{Key: "v", Value: 2}, {Key: "key", Value: expected.keys}, {Key: "name", Value: expected.name}, {Key: "unique", Value: false}, {Key: "sparse", Value: false}, {Key: "hidden", Value: false}, {Key: "background", Value: true}}, ""},
		{"unknown semantic option", bson.D{{Key: "v", Value: 2}, {Key: "key", Value: expected.keys}, {Key: "name", Value: expected.name}, {Key: "wildcardProjection", Value: bson.D{{Key: "user", Value: 1}}}}, "wildcardProjection"},
		{"custom collation", bson.D{{Key: "key", Value: expected.keys}, {Key: "name", Value: expected.name}, {Key: "collation", Value: bson.D{{Key: "locale", Value: "en"}}}}, "collation"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			raw, err := bson.Marshal(tc.fields)
			if err != nil {
				t.Fatal(err)
			}
			metadata, err := parseIndexMetadata(raw)
			if err != nil {
				t.Fatal(err)
			}
			if reason := incompatibleIndex(expected, metadata, keys); (tc.want == "" && reason != "") || (tc.want != "" && !strings.Contains(reason, tc.want)) {
				t.Fatalf("compatibility reason=%q, want substring %q", reason, tc.want)
			}
		})
	}
	t.Run("malformed boolean fails closed", func(t *testing.T) {
		raw, err := bson.Marshal(bson.D{{Key: "key", Value: expected.keys}, {Key: "name", Value: expected.name}, {Key: "unique", Value: "false"}})
		if err != nil {
			t.Fatal(err)
		}
		if _, err := parseIndexMetadata(raw); err == nil {
			t.Fatal("malformed unique option was accepted")
		}
	})
	t.Run("duplicate metadata field fails closed", func(t *testing.T) {
		raw, err := bson.Marshal(bson.D{{Key: "key", Value: expected.keys}, {Key: "name", Value: expected.name}, {Key: "name", Value: expected.name}})
		if err != nil {
			t.Fatal(err)
		}
		if _, err := parseIndexMetadata(raw); err == nil {
			t.Fatal("duplicate metadata field was accepted")
		}
	})
}
