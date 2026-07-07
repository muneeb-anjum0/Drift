# DriftLedger Go Backend

Active backend for DriftLedger, built with Go, Gin, MongoDB, JWT auth, optional Firebase Storage uploads, and local Qwen GGUF drift inference.

## Setup

```bash
cd server-go
go mod tidy
cp .env.example .env
go run ./cmd/api
```

## Environment

MongoDB is required for structured application data. Firebase Storage is optional and disabled by default.

See `.env.example` for all supported variables.

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=driftledger
JWT_SECRET=replace_with_strong_secret
CLIENT_URL=http://localhost:5173
FIREBASE_STORAGE_ENABLED=false
DRIFT_INFERENCE_ENABLED=true
DRIFT_INFERENCE_URL=http://localhost:8000
DRIFT_RELEVANCE_THRESHOLD=0.25
DRIFT_MAX_ANALYZED_REQUIREMENTS=3
```

## Folder Structure

```text
cmd/api/main.go
internal/config
internal/database
internal/middleware
internal/modules
internal/response
internal/router
internal/storage
internal/utils
```

MongoDB stores structured app data. Firebase Storage stores uploaded file blobs only. The React frontend talks to this API through `/api/v1` and never receives Firebase credentials.

## API

Base URL: `http://localhost:5000/api/v1`

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `/workspaces`
- `/projects`
- `/activities`
- `/requirements`
- `/drift`
- `/change-requests`
- `/files`
- `/evaluation`

Responses use:

```json
{ "success": true, "message": "Message", "data": {} }
```

Errors use:

```json
{ "success": false, "message": "Error", "errors": [] }
```

## Firebase Storage

Set `FIREBASE_STORAGE_ENABLED=true`, `FIREBASE_STORAGE_BUCKET`, and `GOOGLE_APPLICATION_CREDENTIALS` on the backend only. Do not expose service account credentials to the React frontend.

If Firebase Storage is disabled, upload requests return a clear disabled message while the rest of the SaaS app continues to run.

## Drift Inference

Project drift analysis uses the local FastAPI inference wrapper and llama.cpp Q4_K_M GGUF model. The backend relevance layer filters unrelated requirements before model calls, then sends only relevant single-requirement candidates to the model.
