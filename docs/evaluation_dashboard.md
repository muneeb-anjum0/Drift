# Evaluation Dashboard

The Evaluation page runs a focused Q4_K_M benchmark inside the app.

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

The backend checks the local inference runtime, runs 10 focused baseline/message cases against the Q4_K_M model, and keeps the latest run in app memory for the dashboard.

The in-app evaluation does not create `q4_quality_*.json` or Markdown files.

The benchmark checks portfolio demo cases for labels, confidence, reasoning, and rough latency.

The summary endpoint also includes approval quality counts for the authenticated workspace:

```text
pending approvals
approved changes
rejected changes
needs revision
```

## CLI Fallback

The old script is still useful for terminal checks if you explicitly want files:

```powershell
python tools\evaluate_q4_quality.py
```

## Empty Dashboard

If `/evaluation` says no benchmark run exists, click **Run evaluation**.

## Speed Notes

Evaluation is faster now because each benchmark case sends one focused baseline requirement to the model. It no longer creates a project, freezes a baseline, and runs requirement-level aggregation for every case.

It can still be slow on CPU because Qwen2.5-7B Q4_K_M is a large local GGUF model. A capable NVIDIA GPU, fewer cases, shorter generations, or a smaller distilled model will reduce latency further.
