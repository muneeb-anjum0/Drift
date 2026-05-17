# DriftLedger

DriftLedger is a SaaS foundation for freelancers, agencies, and software teams to organize client work, track original requirements, and detect requirement drift before it becomes scope creep.

Phase 1 focuses on the product base: authentication, workspaces, projects, protected routes, dashboard UI, activity logging, and a clean scalable MERN architecture.

Phase 2 adds the Requirement Intelligence Layer: structured requirement management, baseline snapshots, local requirement extraction, version history, and the frontend foundation for future AI-assisted drift detection.

Phase 3 adds the Drift Detection and Change Request Engine: rule-based drift analysis, optional Ollama enhancement, saved drift history, and client-friendly change request generation.

## Phase 1 Scope

Completed in this phase:

- JWT authentication with register, login, me, and logout endpoints
- Workspace CRUD with membership records
- Project CRUD with workspace ownership checks
- Activity logging for core user actions
- Protected dashboard layout and SaaS-style frontend shell
- Landing page, auth pages, workspaces page, projects page, and project details page
- MongoDB models and Express service/controller separation
- Zod validation and centralized API error handling

## Phase 2 Scope

Completed in this phase:

- Requirement model with project, workspace, status, priority, type, source, baseline, and effort fields
- Requirement version model with immutable requirement snapshots
- Requirement CRUD APIs
- Requirement baseline creation API
- Local rule-based requirement extraction from project scope text
- Requirement activity logs for create, update, delete, extract, and baseline actions
- Requirement table, create/edit modal, extraction review panel, baseline button, and version history UI
- Project details page requirement section with summary cards and baseline management
- AI service placeholder for a future Gemini/OpenAI integration without requiring API keys

## Phase 3 Scope

Completed in this phase:

- DriftAnalysis model for saved drift reports
- ChangeRequest model for client-friendly scope change drafts
- Rule-based drift detection against baseline requirement snapshots
- Drift scoring service with risk levels, counts, and effort estimates
- Optional Ollama local enhancement with automatic fallback to the rule-based engine
- Drift analysis preview, save, history, and delete APIs
- Change request generation, save, update, history, and delete APIs
- Drift analysis UI with baseline selection, input type selection, preview, and save flow
- Drift history UI with expandable saved reports and delete support
- Change request preview UI with editable draft fields and save flow
- Change request history UI with status updates and delete support
- README and environment documentation for the new drift workflow

## Future Vision

Planned later phases will add:

- PDF export for drift reports and change requests
- Client portal for sharing approved scope updates
- Advanced AI summaries and richer drift explanations
- Deployment polish and production hardening
- Billing and subscription management

## Tech Stack

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router DOM
- Axios
- TanStack Query
- Lucide React

Backend:

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- JWT authentication
- bcryptjs
- Zod validation
- dotenv
- cors
- helmet
- morgan
- cookie-parser

## Folder Structure

```text
driftledger/
├── client/
│   ├── public/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── pages/
│       ├── routes/
│       ├── store/
│       ├── types/
│       └── utils/
├── server/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── validators/
│       ├── utils/
│       └── types/
└── package.json
```

## Environment Variables

Copy the example files and fill in your values:

### `server/.env`

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
OLLAMA_ENABLED=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=30000
```

### `client/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## Optional Ollama

Ollama is optional. DriftLedger works without it by using the local rule-based drift engine.

To use Ollama locally:

1. Install Ollama from the official website.
2. Pull a model, for example:

```bash
ollama pull llama3.1:8b
```

or a lighter model:

```bash
ollama pull mistral:7b
```

3. Start Ollama locally.
4. Add these values to `server/.env`:

```env
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=30000
```

If Ollama is disabled or unavailable, DriftLedger automatically falls back to the rule-based engine.

## Installation

```bash
npm install
```

If you want to reinstall both workspace dependencies later:

```bash
npm run install:all
```

## Run Locally

Start both apps together:

```bash
npm run dev
```

Run only the frontend:

```bash
npm run dev:client
```

Run only the backend:

```bash
npm run dev:server
```

## API Endpoints

Base URL: `/api/v1`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

### Workspaces

- `POST /workspaces`
- `GET /workspaces`
- `GET /workspaces/:workspaceId`
- `PATCH /workspaces/:workspaceId`
- `DELETE /workspaces/:workspaceId`

### Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `PATCH /projects/:projectId`
- `DELETE /projects/:projectId`

### Requirements

- `GET /requirements/project/:projectId`
- `POST /requirements`
- `GET /requirements/:requirementId`
- `PATCH /requirements/:requirementId`
- `DELETE /requirements/:requirementId`
- `POST /requirements/extract`
- `POST /requirements/baseline`
- `GET /requirements/versions/:projectId`

### Drift

- `POST /drift/analyze`
- `POST /drift/save`
- `GET /drift/project/:projectId`
- `GET /drift/:driftAnalysisId`
- `DELETE /drift/:driftAnalysisId`

### Change Requests

- `POST /change-requests/generate`
- `POST /change-requests`
- `GET /change-requests/project/:projectId`
- `GET /change-requests/:changeRequestId`
- `PATCH /change-requests/:changeRequestId`
- `DELETE /change-requests/:changeRequestId`

### Activities

- `GET /activities`
- `GET /activities/:workspaceId`

## Notes

- JWTs are stored in `localStorage` on the frontend for Phase 1 simplicity.
- Passwords are hashed before storage and never returned in API responses.
- All workspace and project data is scoped to the authenticated user.
- Phase 1 is complete for the core SaaS foundation.
- Phase 2 is the structured requirement foundation for future drift detection.
- Phase 3 is the drift detection and change request layer built on top of approved baselines.
- DriftLedger works without paid AI APIs. Ollama is optional and falls back to the local rule-based engine when unavailable.
