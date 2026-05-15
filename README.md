# DriftLedger

DriftLedger is a SaaS foundation for freelancers, agencies, and software teams to organize client work, track original requirements, and prepare for future requirement drift analysis.

Phase 1 focuses on the product base: authentication, workspaces, projects, protected routes, dashboard UI, activity logging, and a clean scalable MERN architecture. AI drift detection, change request generation, and billing are intentionally reserved for later phases.

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

## Future Vision

Planned later phases will add:

- AI requirement extraction and comparison
- Requirement diff generation
- Scope drift reports
- Change request documents
- Client-friendly explanations
- Updated task lists and impact estimates
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
```

### `client/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

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

### Activities

- `GET /activities`
- `GET /activities/:workspaceId`

## Notes

- JWTs are stored in `localStorage` on the frontend for Phase 1 simplicity.
- Passwords are hashed before storage and never returned in API responses.
- All workspace and project data is scoped to the authenticated user.
- Phase 1 is complete for the current product scope.
