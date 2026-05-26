package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	AppEnv                 string
	MongoURI               string
	MongoDatabase          string
	JWTSecret              string
	JWTExpiresInHours      int
	ClientURL              string
	OllamaEnabled          bool
	OllamaBaseURL          string
	OllamaModel            string
	OllamaTimeout          time.Duration
	FirebaseStorageEnabled bool
	FirebaseStorageBucket  string
	MaxUploadSizeMB        int64
}

func Load() Config {
	_ = godotenv.Load()
	return Config{
		Port:                   get("PORT", "5000"),
		AppEnv:                 get("APP_ENV", "development"),
		MongoURI:               get("MONGO_URI", "mongodb://localhost:27017"),
		MongoDatabase:          get("MONGO_DATABASE", "driftledger"),
		JWTSecret:              get("JWT_SECRET", "replace_with_strong_secret"),
		JWTExpiresInHours:      getInt("JWT_EXPIRES_IN_HOURS", 168),
		ClientURL:              get("CLIENT_URL", "http://localhost:5173"),
		OllamaEnabled:          getBool("OLLAMA_ENABLED", false),
		OllamaBaseURL:          get("OLLAMA_BASE_URL", "http://localhost:11434"),
		OllamaModel:            get("OLLAMA_MODEL", "llama3.1:8b"),
		OllamaTimeout:          time.Duration(getInt("OLLAMA_TIMEOUT_MS", 30000)) * time.Millisecond,
		FirebaseStorageEnabled: getBool("FIREBASE_STORAGE_ENABLED", false),
		FirebaseStorageBucket:  get("FIREBASE_STORAGE_BUCKET", ""),
		MaxUploadSizeMB:        int64(getInt("MAX_UPLOAD_SIZE_MB", 10)),
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

func getBool(key string, fallback bool) bool {
	value, err := strconv.ParseBool(os.Getenv(key))
	if err != nil {
		return fallback
	}
	return value
}
