# Evaluation Dashboard

The Evaluation page runs and displays the automated Q4_K_M quality pipeline.

Route:

```text
/evaluation
```

Backend API:

```text
GET /api/v1/evaluation/summary
POST /api/v1/evaluation/runs
GET /api/v1/evaluation/runs/current
GET /api/v1/evaluation/reports
GET /api/v1/evaluation/reports/latest
```

## Run A Report In The App

Start Docker:

```powershell
docker compose up --build
```

Open:

```text
http://localhost:5173/evaluation
```

Click **Run evaluation**.

The backend creates a temporary benchmark workspace, seeds requirements, freezes a baseline, runs the same model-backed drift analyzer used by the app, writes JSON/Markdown reports, and cleans up the temporary data.

Reports are still saved in:

```text
reports/evaluation
```

The report checks portfolio demo cases for labels, score ranges, grouped change titles, affected modules, and rough latency.

The summary endpoint also includes approval quality counts for the authenticated workspace:

```text
pending approvals
approved changes
rejected changes
needs revision
```

## CLI Fallback

The old script is still useful for terminal checks:

```powershell
python tools\evaluate_q4_quality.py
```

## Empty Dashboard

If `/evaluation` says no report exists, click **Run evaluation**. The empty state should start the in-app pipeline instead of asking you to run a command.
