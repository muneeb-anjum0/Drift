# DriftLedger

DriftLedger is a full-stack SaaS platform for freelancers, agencies, and software teams to detect scope drift, document requirement changes, and generate client-ready change requests.

## Overview

Client projects often drift after the original scope is approved. New features, vague improvements, and quiet requirement changes can create unpaid work and delivery risk. DriftLedger helps teams preserve the original scope, structure requirements, create baselines, compare new client input, score scope creep risk, and generate approval drafts.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Go / Golang with Gin
- Database: MongoDB
- File storage: Firebase Storage through backend-only Google Cloud Storage APIs
- Optional AI: Ollama local LLM through plain HTTP

This is no longer a pure MERN app after the Go backend migration. The backend lives in `server-go/`.

## Features

Phase 1 includes authentication, JWT-protected routes, workspaces, projects, dashboard views, activity logs, a SaaS landing page, and the black, white, and lime green UI.

Phase 2 adds structured requirements, requirement version history, local requirement extraction, immutable baselines, and requirement activity logs.

Phase 3 adds rule-based drift detection, deterministic scope creep scoring, optional Ollama enhancement, saved drift history, change request generation, and change request history.

The Go backend also adds project document persistence:

- MongoDB stores file metadata.
- Firebase Storage stores uploaded files.
- Firebase Storage is optional; the app still starts without it.
- Service account credentials stay backend-only.

## Folder Structure

```text
client/      React + Vite frontend
server-go/   Go backend
README.md
.gitignore
package.json
```

The previous Node/Express backend has been removed after the Go migration was verified locally. `server-go/` is the only active backend.

## Environment

Frontend:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Go backend variables are documented in `server-go/.env.example`.

MongoDB is required for structured app data. Firebase Storage and Ollama are optional.

## Running Locally

Install frontend dependencies if needed:

```bash
npm install
```

Install Go module dependencies:

```bash
cd server-go
go mod tidy
```

Start the active Go backend:

```bash
npm run dev:server-go
```

Start the frontend:

```bash
npm run dev:client
```

Or run both together because `concurrently` is already installed:

```bash
npm run dev:go
```

## API Overview

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

Responses use `{ success, message, data }`. Errors use `{ success, message, errors }`.

## File Upload Setup

Set these backend variables only when Firebase Storage should be enabled:

```env
FIREBASE_STORAGE_ENABLED=true
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

Never commit service account files. If Firebase Storage is disabled, upload endpoints return:

```text
Firebase Storage is not enabled. Configure Firebase Storage to upload files.
```

## Ollama

Ollama is optional. Enable it with:

```env
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

If Ollama is disabled or unavailable, drift analysis and change request generation continue with deterministic rule-based logic.

## Screenshots

Screenshots are not committed yet. Add dashboard, project details, drift analysis, and change request screenshots before a public portfolio launch.

## Security Notes

- Authentication remains JWT-based in the Go backend.
- MongoDB stores structured SaaS data.
- Firebase Storage stores only uploaded file blobs.
- Firebase credentials are never exposed to the frontend.
- Secrets, `.env` files, and service account JSON files are ignored by Git.

## Deployment Notes

Deploy the React frontend separately from the Go API. Set `VITE_API_BASE_URL` to the deployed Go API URL. Configure MongoDB in the backend environment. Configure Firebase Storage only when document uploads are required.

## Roadmap

- Team invitations and role management
- Document text extraction
- Exportable change request PDFs
- More detailed estimate workflows
- Deployment hardening and CI checks
