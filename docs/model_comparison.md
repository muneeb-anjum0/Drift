# Q3 vs Q4 Model Comparison

Use this workflow to compare DriftLedger Q3_K_M and Q4_K_M on the same requirement-drift cases.

The script does not start Docker and does not switch models at runtime. DriftLedger loads one GGUF in `drift-llama`, so model switching requires editing `.env` and restarting Docker manually.

## Benchmark Commands

Capture Q3 after starting Docker with the Q3 path:

```powershell
python tools\compare_q3_q4_quality.py --capture q3
```

Capture Q4 after starting Docker with the Q4 path:

```powershell
python tools\compare_q3_q4_quality.py --capture q4
```

Compare the latest captures:

```powershell
python tools\compare_q3_q4_quality.py --compare latest
```

Reports are written to:

```text
reports/model_comparison/
```

That folder is ignored by Git because benchmark output is local runtime evidence.

## Switch Models

Default Q4:

```env
DRIFT_GGUF_MODEL_PATH=/app/models/gguf/DriftLedger-Qwen2.5-7B-Q4_K_M.gguf
VITE_DRIFT_MODEL_LABEL=Qwen2.5-7B + DriftLedger LoRA (GGUF Q4_K_M)
```

Fallback Q3:

```env
DRIFT_GGUF_MODEL_PATH=/app/models/gguf/DriftLedger-Qwen2.5-7B-Q3_K_M.gguf
VITE_DRIFT_MODEL_LABEL=Qwen2.5-7B + DriftLedger LoRA (GGUF Q3_K_M)
```

Restart manually after editing `.env`:

```powershell
docker compose down
docker compose up --build
```

Then confirm:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
```

The health response should show the intended `quantization_label`.

## What The Benchmark Measures

The script records:

- predicted label
- drift score
- impact
- estimated hours
- grouped change title
- summary and reasoning
- latency per request
- pass/fail against expected behavior

The final comparison report shows:

- Q3 pass count
- Q4 pass count
- Q3 average latency
- Q4 average latency
- Q4 improvements
- Q4 regressions
- recommendation on whether to keep Q4 default

## Hardware Note

Q4_K_M usually improves quality over Q3_K_M, but it uses more RAM/VRAM and may be slower. On a GTX 1060 Max-Q 6GB, Q4 may be tight or CPU-bound. If Docker becomes unstable or too slow, switch back to Q3_K_M.
