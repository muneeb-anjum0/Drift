package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                         string
	AppEnv                       string
	MongoURI                     string
	MongoDatabase                string
	JWTSecret                    string
	JWTExpiresInHours            int
	ClientURL                    string
	DriftInferenceEnabled        bool
	DriftInferenceURL            string
	DriftInferenceTimeout        time.Duration
	DriftRelevanceThreshold      float64
	DriftMaxAnalyzedRequirements int
	FirebaseStorageEnabled       bool
	FirebaseStorageBucket        string
	MaxUploadSizeMB              int64
}

func Load() Config {
	_ = godotenv.Load()
	return Config{
		Port:                         get("PORT", "5000"),
		AppEnv:                       get("APP_ENV", "development"),
		MongoURI:                     get("MONGO_URI", "mongodb://localhost:27017"),
		MongoDatabase:                get("MONGO_DATABASE", "driftledger"),
		JWTSecret:                    get("JWT_SECRET", "replace_with_strong_secret"),
		JWTExpiresInHours:            getInt("JWT_EXPIRES_IN_HOURS", 168),
		ClientURL:                    get("CLIENT_URL", "http://localhost:5173"),
		DriftInferenceEnabled:        getBool("DRIFT_INFERENCE_ENABLED", false),
		DriftInferenceURL:            get("DRIFT_INFERENCE_URL", "http://localhost:8000"),
		DriftInferenceTimeout:        time.Duration(getInt("DRIFT_INFERENCE_TIMEOUT_MS", 65000)) * time.Millisecond,
		DriftRelevanceThreshold:      getFloat("DRIFT_RELEVANCE_THRESHOLD", 0.25),
		DriftMaxAnalyzedRequirements: getInt("DRIFT_MAX_ANALYZED_REQUIREMENTS", 3),
		FirebaseStorageEnabled:       getBool("FIREBASE_STORAGE_ENABLED", false),
		FirebaseStorageBucket:        get("FIREBASE_STORAGE_BUCKET", ""),
		MaxUploadSizeMB:              int64(getInt("MAX_UPLOAD_SIZE_MB", 10)),
	}
}

func get(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getInt(key string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil {
		return fallback
	}
	return value
}

func getFloat(key string, fallback float64) float64 {
	value, err := strconv.ParseFloat(os.Getenv(key), 64)
	if err != nil {
		return fallback
	}
	return value
}

func getBool(key string, fallback bool) bool {
	value, err := strconv.ParseBool(os.Getenv(key))
	if err != nil {
		return fallback
	}
	return value
}
