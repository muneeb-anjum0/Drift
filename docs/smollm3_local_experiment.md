# SmolLM3-3B local experiment

This is an optional local experiment, not a replacement for the supported production model or evidence that SmolLM3 meets Drift's classification gate. The model's weights stay outside Git. The F16 GGUF is a format conversion of the BF16 checkpoint, not a quantized model.

Provide a folder containing `SmolLM3-3B-F16.gguf` (tested SHA-256 `e02b775f14f758da909c33a6ac2c6989f3f13aaa55f2c1f3652ea6f02c74352d`). The overlay defaults to 36 GPU layers and an 8192-token context independently of `DRIFT_GPU_LAYERS` in the base `.env`. On an RTX 5050 laptop with 8 GB VRAM, the running model used about 6.6 GiB. If the model cannot load on another GPU, lower `DRIFT_SMOLLM3_GPU_LAYERS` in the ignored `.env`; fewer layers may make the full-scope request exceed the configured timeout.

Set `DRIFT_SMOLLM3_MODEL_DIR` in the ignored `.env` to the absolute model folder. Then start:

```sh
sudo docker compose -f docker-compose.yml -f deploy/compose/gpu.yml -f deploy/compose/smollm3.yml --profile model up -d --build
```

Check `sudo docker compose -f docker-compose.yml -f deploy/compose/gpu.yml -f deploy/compose/smollm3.yml --profile model ps` and the llama/inference logs. The product path asks SmolLM3 for the `scope-assessment-v1` pair ledger and final proposal; the old four-field response remains only for historical diagnostics. One synthetic CSV-to-PDF scope comparison completed in about 20 seconds with the request and proposed revised wording kept separate. This is a runtime smoke test, not an accuracy result. Human review remains necessary. Do not use the sealed final holdout to test this setup.

An earlier in-app 10-case diagnostic run using the old label path reported 8/10 matches. Its two misses should not be treated as a quality score for the new pipeline. `same_monthly_report` expects `unchanged`, although a new download location could be read as added access; `clinic_analytics` expects `modified`, although “Instead of CSV exports” may remove an existing capability. SmolLM3 answered `added` and `contradiction`, respectively. The cases need independent adjudication before reuse as evidence. They were not relabeled to improve the observed score.
