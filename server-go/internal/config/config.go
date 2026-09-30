package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
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
	AuthRateLimitRequests        int
	InferenceRateLimitRequests   int
	RateLimitWindow              time.Duration
	ClientURL                    string
	DriftInferenceEnabled        bool
	DriftInferenceURL            string
	DriftInferenceAPIKey         string
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
		JWTSecret:                    strings.TrimSpace(os.Getenv("JWT_SECRET")),
		JWTExpiresInHours:            getInt("JWT_EXPIRES_IN_HOURS", 168),
		AuthRateLimitRequests:        getInt("AUTH_RATE_LIMIT_REQUESTS", 10),
		InferenceRateLimitRequests:   getInt("INFERENCE_RATE_LIMIT_REQUESTS", 20),
		RateLimitWindow:              time.Duration(getInt("RATE_LIMIT_WINDOW_SECONDS", 60)) * time.Second,
		ClientURL:                    get("CLIENT_URL", "http://localhost:5173"),
		DriftInferenceEnabled:        getBool("DRIFT_INFERENCE_ENABLED", false),
		DriftInferenceURL:            get("DRIFT_INFERENCE_URL", "http://localhost:8000"),
		DriftInferenceAPIKey:         strings.TrimSpace(os.Getenv("DRIFT_INFERENCE_API_KEY")),
		DriftInferenceTimeout:        time.Duration(getInt("DRIFT_INFERENCE_TIMEOUT_MS", 65000)) * time.Millisecond,
		DriftRelevanceThreshold:      getFloat("DRIFT_RELEVANCE_THRESHOLD", 0.25),
		DriftMaxAnalyzedRequirements: getInt("DRIFT_MAX_ANALYZED_REQUIREMENTS", 3),
		FirebaseStorageEnabled:       getBool("FIREBASE_STORAGE_ENABLED", false),
		FirebaseStorageBucket:        get("FIREBASE_STORAGE_BUCKET", ""),
		MaxUploadSizeMB:              int64(getInt("MAX_UPLOAD_SIZE_MB", 10)),
	}
}

func (c Config) Validate() error {
	if len(c.JWTSecret) < 32 || isKnownInsecureSecret(c.JWTSecret) {
		return fmt.Errorf("JWT_SECRET must be set to a non-default value of at least 32 characters")
	}
	if c.JWTExpiresInHours <= 0 {
		return fmt.Errorf("JWT_EXPIRES_IN_HOURS must be greater than zero")
	}
	if c.AuthRateLimitRequests <= 0 || c.InferenceRateLimitRequests <= 0 || c.RateLimitWindow <= 0 {
		return fmt.Errorf("rate limit values must be greater than zero")
	}
	if c.MaxUploadSizeMB <= 0 {
		return fmt.Errorf("MAX_UPLOAD_SIZE_MB must be greater than zero")
	}
	if c.FirebaseStorageEnabled && strings.TrimSpace(c.FirebaseStorageBucket) == "" {
		return fmt.Errorf("FIREBASE_STORAGE_BUCKET is required when Firebase Storage is enabled")
	}
	if c.DriftInferenceEnabled {
		if strings.TrimSpace(c.DriftInferenceURL) == "" {
			return fmt.Errorf("DRIFT_INFERENCE_URL is required when inference is enabled")
		}
		if len(c.DriftInferenceAPIKey) < 32 || isKnownInsecureSecret(c.DriftInferenceAPIKey) {
			return fmt.Errorf("DRIFT_INFERENCE_API_KEY must be set to a non-default value of at least 32 characters when inference is enabled")
		}
	}
	return nil
}

func isKnownInsecureSecret(secret string) bool {
	switch strings.ToLower(strings.TrimSpace(secret)) {
	case "", "secret", "changeme", "replace_with_strong_secret", "replace_with_a_strong_secret":
		return true
	default:
		return false
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
