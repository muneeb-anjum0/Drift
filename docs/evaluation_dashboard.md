# Evaluation Dashboard

The Evaluation page shows the latest Q4_K_M quality report.

Route:

```text
/evaluation
```

Backend API:

```text
GET /api/v1/evaluation/summary
GET /api/v1/evaluation/reports
GET /api/v1/evaluation/reports/latest
```

## Generate A Report

Start Docker first:

```powershell
docker compose up --build
```

Then run:

```powershell
python tools\evaluate_q4_quality.py
```

Reports are saved in:

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

## Empty Dashboard

If `/evaluation` says no report exists, generate one with:

```powershell
python tools\evaluate_q4_quality.py
```

The empty state should show this command instead of throwing an error.
