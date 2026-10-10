package database

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"driftledger/server-go/internal/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Mongo struct {
	Client *mongo.Client
	DB     *mongo.Database
}

func Connect(cfg config.Config) (*Mongo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, err
	}
	db := client.Database(cfg.MongoDatabase)
	if err := EnsureIndexes(ctx, db); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, err
	}
	return &Mongo{Client: client, DB: db}, nil
}

func (m *Mongo) Disconnect(ctx context.Context) error {
	return m.Client.Disconnect(ctx)
}

type indexDefinition struct {
	collection string
	name       string
	keys       bson.D
	unique     bool
}

var expectedIndexes = []indexDefinition{
	{"users", "email_1", bson.D{{Key: "email", Value: 1}}, true},
	{"workspacemembers", "workspace_1_user_1", bson.D{{Key: "workspace", Value: 1}, {Key: "user", Value: 1}}, true},
	{"workspacemembers", "user_1", bson.D{{Key: "user", Value: 1}}, false},
	{"workspaces", "owner_1", bson.D{{Key: "owner", Value: 1}}, false},
	{"workspaces", "slug_1", bson.D{{Key: "slug", Value: 1}}, true},
	{"projects", "workspace_1", bson.D{{Key: "workspace", Value: 1}}, false},
	{"projects", "createdBy_1", bson.D{{Key: "createdBy", Value: 1}}, false},
	{"activitylogs", "workspace_1_createdAt_-1", bson.D{{Key: "workspace", Value: 1}, {Key: "createdAt", Value: -1}}, false},
	{"requirements", "project_1", bson.D{{Key: "project", Value: 1}}, false},
	{"requirements", "workspace_1", bson.D{{Key: "workspace", Value: 1}}, false},
	{"requirementversions", "project_1_versionNumber_-1", bson.D{{Key: "project", Value: 1}, {Key: "versionNumber", Value: -1}}, false},
	{"requirementversions", "project_version_unique", bson.D{{Key: "project", Value: 1}, {Key: "versionNumber", Value: 1}}, true},
	{"driftanalyses", "project_1_createdAt_-1", bson.D{{Key: "project", Value: 1}, {Key: "createdAt", Value: -1}}, false},
	{"changerequests", "project_1_createdAt_-1", bson.D{{Key: "project", Value: 1}, {Key: "createdAt", Value: -1}}, false},
	{"files", "project_1_createdAt_-1", bson.D{{Key: "project", Value: 1}, {Key: "createdAt", Value: -1}}, false},
}

type IndexReport struct {
	Missing    []string `json:"missing"`
	Unexpected []string `json:"unexpected"`
}

func (d indexDefinition) model() mongo.IndexModel {
	indexOptions := options.Index().SetName(d.name)
	if d.unique {
		indexOptions.SetUnique(true)
	}
	return mongo.IndexModel{Keys: d.keys, Options: indexOptions}
}

// CheckIndexes reads index metadata without creating or dropping anything.
// A same-name or same-key incompatible definition fails before provisioning.
func CheckIndexes(ctx context.Context, db *mongo.Database) (IndexReport, error) {
	report := IndexReport{Missing: []string{}, Unexpected: []string{}}
	collections, err := db.ListCollectionNames(ctx, bson.D{})
	if err != nil {
		return report, err
	}
	known := make(map[string]bool, len(collections))
	for _, name := range collections {
		known[name] = true
	}
	byCollection := make(map[string][]*mongo.IndexSpecification)
	for _, expected := range expectedIndexes {
		if !known[expected.collection] {
			continue
		}
		if _, loaded := byCollection[expected.collection]; loaded {
			continue
		}
		specifications, err := db.Collection(expected.collection).Indexes().ListSpecifications(ctx)
		if err != nil {
			return report, fmt.Errorf("list %s indexes: %w", expected.collection, err)
		}
		byCollection[expected.collection] = specifications
	}
	matched := make(map[string]bool, len(expectedIndexes))
	for _, expected := range expectedIndexes {
		identity := expected.collection + "." + expected.name
		expectedKeys, err := bson.Marshal(expected.keys)
		if err != nil {
			return report, fmt.Errorf("encode %s keys: %w", identity, err)
		}
		for _, existing := range byCollection[expected.collection] {
			sameKeys := bytes.Equal(existing.KeysDocument, expectedKeys)
			if existing.Name != expected.name && !sameKeys {
				continue
			}
			unique := existing.Unique != nil && *existing.Unique
			if existing.Name != expected.name || !sameKeys || unique != expected.unique || existing.Sparse != nil && *existing.Sparse || existing.ExpireAfterSeconds != nil {
				return report, fmt.Errorf("incompatible index %s.%s: expected %s keys=%v unique=%t", expected.collection, existing.Name, expected.name, expected.keys, expected.unique)
			}
			matched[identity] = true
		}
		if !matched[identity] {
			report.Missing = append(report.Missing, identity)
		}
	}
	for collection, specifications := range byCollection {
		for _, existing := range specifications {
			if existing.Name != "_id_" && !matched[collection+"."+existing.Name] {
				report.Unexpected = append(report.Unexpected, collection+"."+existing.Name)
			}
		}
	}
	sort.Strings(report.Unexpected)
	return report, nil
}

// EnsureIndexes first checks compatibility, then creates only missing indexes.
// It never drops, rewrites, or renames an existing index.
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	report, err := CheckIndexes(ctx, db)
	if err != nil {
		return err
	}
	missing := make(map[string]bool, len(report.Missing))
	for _, identity := range report.Missing {
		missing[identity] = true
	}
	for _, expected := range expectedIndexes {
		if !missing[expected.collection+"."+expected.name] {
			continue
		}
		if _, err := db.Collection(expected.collection).Indexes().CreateOne(ctx, expected.model()); err != nil {
			return fmt.Errorf("create %s.%s index: %w", expected.collection, expected.name, err)
		}
	}
	verified, err := CheckIndexes(ctx, db)
	if err != nil {
		return err
	}
	if len(verified.Missing) > 0 {
		return errors.New("required indexes remain missing after provisioning")
	}
	return nil
}
