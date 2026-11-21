# SmolLM3-3B local experiment

This is an optional local experiment, not a replacement for the supported production model or evidence that SmolLM3 meets Drift's classification gate. The model's weights stay outside Git. The F16 GGUF is a format conversion of the BF16 checkpoint, not a quantized model.

The prepared checkpoint lives at `/home/muneebanjum/Model/SmolLM3-3B`. Its converted file is `SmolLM3-3B-F16.gguf` (SHA-256 `e02b775f14f758da909c33a6ac2c6989f3f13aaa55f2c1f3652ea6f02c74352d`). On this RTX 5050 laptop, a 1024-token local llama.cpp load and one synthetic six-label request succeeded at about 6.1 GiB VRAM. This is a smoke test, not an accuracy result.

Set `DRIFT_SMOLLM3_MODEL_DIR` in the ignored `.env` to the absolute model folder. Then start:

```sh
sudo docker compose -f docker-compose.yml -f deploy/compose/gpu.yml -f deploy/compose/smollm3.yml --profile model up -d --build
```

Check `sudo docker compose -f docker-compose.yml -f deploy/compose/gpu.yml -f deploy/compose/smollm3.yml --profile model ps` and the llama/inference logs. The experimental adapter asks SmolLM3 for Drift's existing four-field JSON response. A valid response does not establish that its confidence or explanation is calibrated; human review remains necessary. Do not use the sealed final holdout to test this setup.

The first in-app 10-case run reported 8/10 matches. The two misses should not be interpreted as a clean model-quality score. `same_monthly_report` expects `unchanged`, but adding a download location on the reports page can reasonably be read as an added access path. `clinic_analytics` expects `modified`, while its message says "Instead of CSV exports," explicitly removing the baseline export capability; under the current removal-priority rule, `removed` is also defensible. SmolLM3 answered `added` and `contradiction`, respectively. The second answer is still at odds with the current rule, but the benchmark's expected label also needs independent review. Do not relabel either case merely to improve this observed score; adjudicate the set before using it as quality evidence.
