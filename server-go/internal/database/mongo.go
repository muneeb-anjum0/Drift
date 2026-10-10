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

// listIndexes exposes options that ListSpecifications omits, including partial
// filters and collations. Only v/ns and the completed build's background flag
// are irrelevant to the semantics of Drift's ordinary B-tree indexes.
type indexMetadata struct {
	name                 string
	keys                 bson.Raw
	unique               bool
	sparse               bool
	hidden               bool
	hasTTL               bool
	hasPartialFilter     bool
	hasCollation         bool
	otherSemanticOptions []string
}

func parseIndexMetadata(document bson.Raw) (indexMetadata, error) {
	metadata := indexMetadata{}
	elements, err := document.Elements()
	if err != nil {
		return metadata, err
	}
	seen := make(map[string]bool, len(elements))
	for _, element := range elements {
		key := element.Key()
		if seen[key] {
			return metadata, fmt.Errorf("duplicate index metadata field %q", key)
		}
		seen[key] = true
		value := element.Value()
		switch key {
		case "name":
			metadata.name, err = stringIndexOption(value, key)
		case "key":
			var ok bool
			metadata.keys, ok = value.DocumentOK()
			if !ok {
				err = fmt.Errorf("index metadata %q must be a document", key)
			} else {
				metadata.keys = bytes.Clone(metadata.keys)
			}
		case "unique":
			metadata.unique, err = boolIndexOption(value, key)
		case "sparse":
			metadata.sparse, err = boolIndexOption(value, key)
		case "hidden":
			metadata.hidden, err = boolIndexOption(value, key)
		case "expireAfterSeconds":
			metadata.hasTTL = true
		case "partialFilterExpression":
			metadata.hasPartialFilter = true
		case "collation":
			metadata.hasCollation = true
		case "v", "ns", "background":
			// Server/index-build metadata does not alter a completed index's behavior.
		default:
			// Unknown options are incompatible for an expected Drift index.
			metadata.otherSemanticOptions = append(metadata.otherSemanticOptions, key)
		}
		if err != nil {
			return metadata, err
		}
	}
	if !seen["name"] || metadata.name == "" || !seen["key"] {
		return metadata, errors.New("index metadata lacks name or ordered key document")
	}
	return metadata, nil
}

func stringIndexOption(value bson.RawValue, name string) (string, error) {
	result, ok := value.StringValueOK()
	if !ok {
		return "", fmt.Errorf("index metadata %q must be a string", name)
	}
	return result, nil
}

func boolIndexOption(value bson.RawValue, name string) (bool, error) {
	result, ok := value.BooleanOK()
	if !ok {
		return false, fmt.Errorf("index metadata %q must be a boolean", name)
	}
	return result, nil
}

func incompatibleIndex(expected indexDefinition, existing indexMetadata, expectedKeys bson.Raw) string {
	if existing.name != expected.name {
		return "wrong name"
	}
	if !bytes.Equal(existing.keys, expectedKeys) {
		return "wrong ordered keys or direction"
	}
	if existing.unique != expected.unique {
		return "wrong unique setting"
	}
	if existing.sparse {
		return "unexpected sparse setting"
	}
	if existing.hasTTL {
		return "unexpected expireAfterSeconds"
	}
	if existing.hasPartialFilter {
		return "unexpected partialFilterExpression"
	}
	if existing.hasCollation {
		return "unexpected collation"
	}
	if existing.hidden {
		return "unexpected hidden setting"
	}
	if len(existing.otherSemanticOptions) > 0 {
		return "unexpected option " + existing.otherSemanticOptions[0]
	}
	return ""
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
	byCollection := make(map[string][]indexMetadata)
	for _, expected := range expectedIndexes {
		if !known[expected.collection] {
			continue
		}
		if _, loaded := byCollection[expected.collection]; loaded {
			continue
		}
		cursor, err := db.Collection(expected.collection).Indexes().List(ctx)
		if err != nil {
			return report, fmt.Errorf("list %s indexes: %w", expected.collection, err)
		}
		indexes := []indexMetadata{}
		for cursor.Next(ctx) {
			var document bson.Raw
			if err := cursor.Decode(&document); err != nil {
				_ = cursor.Close(ctx)
				return report, fmt.Errorf("decode %s index: %w", expected.collection, err)
			}
			metadata, err := parseIndexMetadata(document)
			if err != nil {
				_ = cursor.Close(ctx)
				return report, fmt.Errorf("parse %s index: %w", expected.collection, err)
			}
			indexes = append(indexes, metadata)
		}
		if err := cursor.Err(); err != nil {
			_ = cursor.Close(ctx)
			return report, fmt.Errorf("read %s indexes: %w", expected.collection, err)
		}
		if err := cursor.Close(ctx); err != nil {
			return report, fmt.Errorf("close %s indexes: %w", expected.collection, err)
		}
		byCollection[expected.collection] = indexes
	}
	matched := make(map[string]bool, len(expectedIndexes))
	for _, expected := range expectedIndexes {
		identity := expected.collection + "." + expected.name
		expectedKeys, err := bson.Marshal(expected.keys)
		if err != nil {
			return report, fmt.Errorf("encode %s keys: %w", identity, err)
		}
		for _, existing := range byCollection[expected.collection] {
			sameKeys := bytes.Equal(existing.keys, expectedKeys)
			if existing.name != expected.name && !sameKeys {
				continue
			}
			if reason := incompatibleIndex(expected, existing, expectedKeys); reason != "" {
				return report, fmt.Errorf("incompatible index %s.%s: %s; expected %s keys=%v unique=%t", expected.collection, existing.name, reason, expected.name, expected.keys, expected.unique)
			}
			matched[identity] = true
		}
		if !matched[identity] {
			report.Missing = append(report.Missing, identity)
		}
	}
	for collection, indexes := range byCollection {
		for _, existing := range indexes {
			if existing.name != "_id_" && !matched[collection+"."+existing.name] {
				report.Unexpected = append(report.Unexpected, collection+"."+existing.name)
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
