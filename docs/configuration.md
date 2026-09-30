# Configuration Contract

Real secrets belong only in ignored `.env` files or deployment secret stores. Example values must remain blank or obviously non-secret.

## Application variables

| Variable | Class | Purpose and default |
| --- | --- | --- |
| `JWT_SECRET` | Required | JWT signing secret, independent and at least 32 characters. No safe default. |
| `DRIFT_INFERENCE_API_KEY` | Required when inference enabled | Backend-to-inference credential, independent and at least 32 characters. |
| `MONGO_URI` | Required in deployment | Mongo connection; local default is `mongodb://localhost:27017`. |
| `MONGO_DATABASE` | Optional | Database name; defaults to `driftledger`. |
| `APP_ENV` | Optional | `development` enables developer logging/routes; deployment uses `production`. |
| `PORT` | Optional | Backend port; defaults to `5000`. |
| `CLIENT_URL` | Optional | Allowed browser origin; defaults to local Vite. |
| `JWT_EXPIRES_IN_HOURS` | Optional | Token lifetime; defaults to 168 hours. |
| `AUTH_RATE_LIMIT_REQUESTS` | Optional | Per-process login/register limit; defaults to 10. |
| `INFERENCE_RATE_LIMIT_REQUESTS` | Optional | Per-user expensive-route limit; defaults to 20. |
| `RATE_LIMIT_WINDOW_SECONDS` | Optional | Rate-limit window; defaults to 60 seconds. |
| `DRIFT_INFERENCE_ENABLED` | Optional | Enables model-backed analysis. |
| `DRIFT_INFERENCE_URL` | Required when enabled | Internal FastAPI URL. |
| `DRIFT_INFERENCE_TIMEOUT_MS` | Optional | Go-to-FastAPI deadline; defaults to 65000 ms. |
| `DRIFT_RELEVANCE_THRESHOLD` | Optional | Requirement-selection threshold; defaults to 0.25. |
| `DRIFT_MAX_ANALYZED_REQUIREMENTS` | Optional | Bounds model calls per analysis; defaults to 3. |
| `MAX_UPLOAD_SIZE_MB` | Optional | Request/file limit; defaults to 10 MB. |
| `FIREBASE_STORAGE_ENABLED` | Optional | Enables cloud document storage; defaults to false. |
| `FIREBASE_STORAGE_BUCKET` | Required when storage enabled | Isolated configured bucket name. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Required when storage enabled | Path to an ignored service-account file or workload-provided credential. |
| `VITE_API_BASE_URL` | Build-time optional | Browser API base; same-origin `/api/v1` is used in the container build. |

## Model-only variables

All `DRIFT_LLAMA_*`, model/artifact path variables, `DRIFT_ALLOW_CPU`, and `HF_TOKEN` are model-development settings. `HF_TOKEN` is optional and must never be committed or printed. See `docs/local_model_setup.md`.

## Test-only variables

`MONGO_TEST_URI` opts into destructive integration tests. It must point to disposable MongoDB; each test uses and drops a uniquely named database.
