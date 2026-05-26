# DriftLedger

Track requirement drift before it becomes unpaid work.

DriftLedger is a SaaS platform for freelancers, agencies, and software teams. It helps users capture original scope, structure requirements, create baseline versions, detect drift in later client messages, estimate extra effort, and generate client-friendly change requests.

## Problem

Client scope changes often arrive as vague messages, meeting notes, or incremental requests. That makes it hard to prove what changed, estimate the impact, and protect delivery time.

## Solution

DriftLedger turns scope into structured requirements, freezes approved baselines, compares new input against those baselines, and generates a clear change request draft when drift appears.

## Completed Phases

Phase 1: SaaS foundation with auth, workspaces, projects, dashboard, protected routes, app layout, and activity logs.

Phase 2: Requirement Intelligence Layer with requirement CRUD, extraction, baseline snapshots, and version history.

Phase 3: Drift Detection and Change Request Engine with Ollama-powered analysis, deterministic scoring, drift history, and change request generation/history.

## Tech Stack

Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, Axios, Lucide React, and Framer Motion.

Backend: Node.js, Express.js, TypeScript, JWT auth, bcryptjs, Zod, dotenv, cors, helmet, morgan, cookie-parser, Mongoose models, and a Firestore-backed service layer for the current live data path.

AI: Ollama-powered local analysis by default using `llama3.1:8b`.

## Folder Structure

```text
driftledger/
|-- client/
|   |-- public/
|   `-- src/
|       |-- api/
|       |-- components/
|       |-- contexts/
|       |-- features/
|       |-- hooks/
|       |-- pages/
|       |-- routes/
|       |-- store/
|       |-- types/
|       `-- utils/
|-- server/
|   |-- scripts/
|   `-- src/
|       |-- config/
|       |-- controllers/
|       |-- middlewares/
|       |-- models/
|       |-- routes/
|       |-- services/
|       |-- types/
|       |-- utils/
|       `-- validators/
`-- package.json
```

## Environment Variables

Client:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Server:

```env
PORT=5000
NODE_ENV=development
USE_FIRESTORE=true
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
FIREBASE_CLIENT_ID=your_firebase_client_id
FIREBASE_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your_service_account_email

OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=30000
```

## Installation

```bash
npm install
```

Useful scripts:

```bash
npm run install:all
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm run build:client
npm run build:server
```

## API Endpoints

Base URL: `/api/v1`

Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`

Workspaces: `POST /workspaces`, `GET /workspaces`, `GET /workspaces/:workspaceId`, `PATCH /workspaces/:workspaceId`, `DELETE /workspaces/:workspaceId`

Projects: `POST /projects`, `GET /projects`, `GET /projects/:projectId`, `PATCH /projects/:projectId`, `DELETE /projects/:projectId`

Requirements: `GET /requirements/project/:projectId`, `POST /requirements`, `GET /requirements/:requirementId`, `PATCH /requirements/:requirementId`, `DELETE /requirements/:requirementId`, `POST /requirements/extract`, `POST /requirements/baseline`, `GET /requirements/versions/:projectId`

Drift: `POST /drift/analyze`, `POST /drift/save`, `GET /drift/project/:projectId`, `GET /drift/:driftAnalysisId`, `DELETE /drift/:driftAnalysisId`

Change requests: `POST /change-requests/generate`, `POST /change-requests`, `GET /change-requests/project/:projectId`, `GET /change-requests/:changeRequestId`, `PATCH /change-requests/:changeRequestId`, `DELETE /change-requests/:changeRequestId`

Activities: `GET /activities`, `GET /activities/:workspaceId`

## Ollama Setup

Drift analysis is powered by Ollama by default. Install Ollama, pull the configured model, and keep Ollama running while using the app.

```bash
ollama pull llama3.1:8b
```

Then set:

```env
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=30000
```

## Screenshots

Add product screenshots here once you have deployment-ready images.

## Deployment Notes

- Keep `JWT_SECRET` and Firebase service account values out of source control.
- Set `VITE_API_BASE_URL` to the deployed API base URL.
- Keep Ollama running or point `OLLAMA_BASE_URL` to a reachable Ollama host before demoing drift analysis.
- Confirm Firestore indexes/rules are configured before demoing with live data.

## Future Roadmap

- PDF export for drift reports and change requests
- Client portal for approved scope changes
- Advanced AI summaries and richer explanation layers
- Deployment polish and production monitoring
- Billing-ready plans
- Team invitations
- Email notifications

## Recruiter-Friendly Summary

DriftLedger demonstrates full-stack SaaS architecture, authenticated workspace isolation, structured domain modeling, AI-powered local drift analysis, deterministic scoring, and a polished React UI. It is built to show product thinking, backend discipline, and practical scope-control workflows rather than a toy demo.
