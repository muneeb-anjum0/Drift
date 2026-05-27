# DriftLedger Go Backend

Active backend for DriftLedger, built with Go, Gin, MongoDB, JWT auth, optional Firebase Storage uploads, and optional Ollama enhancement.

## Setup

```bash
cd server-go
go mod tidy
cp .env.example .env
go run ./cmd/api
```

## Environment

MongoDB is required for structured application data. Firebase Storage and Ollama are optional and disabled by default.

See `.env.example` for all supported variables.

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=driftledger
JWT_SECRET=replace_with_strong_secret
CLIENT_URL=http://localhost:5173
FIREBASE_STORAGE_ENABLED=false
OLLAMA_ENABLED=false
```

## Folder Structure

```text
cmd/api/main.go
internal/config
internal/database
internal/middleware
internal/modules
internal/ollama
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

## Ollama

Set `OLLAMA_ENABLED=true` to allow local enhancement through `POST /api/generate`. If Ollama is unavailable or returns invalid data, the backend falls back to rule-based logic.
