.PHONY: setup run test test-integration test-e2e lint format build verify model-build model-check model-smoke model-eval model-benchmark

PYTHON ?= python3
VENV ?= .venv

setup:
	cd frontend && npm ci
	cd backend && go mod download
	$(PYTHON) -m venv $(VENV)
	$(VENV)/bin/pip install --requirement ai_model/inference/requirements-dev.txt

run:
	docker compose up -d --build db inference backend frontend

test:
	cd backend && go test ./...
	$(VENV)/bin/python -m pytest ai_model/inference/test_app.py

test-integration:
	@test -n "$(MONGO_TEST_URI)" || (echo "MONGO_TEST_URI is required" >&2; exit 2)
	cd backend && go test -count=1 ./internal/integration

test-e2e:
	cd frontend && npm run test:e2e

lint:
	cd frontend && npm run lint
	@test -z "$$(cd backend && gofmt -l .)" || (cd backend && gofmt -l .; exit 1)
	cd backend && go vet ./...
	$(VENV)/bin/ruff check --exclude ai_model/tooling/vendor ai_model/inference ai_model/tooling tools

format:
	cd backend && gofmt -w .
	$(VENV)/bin/ruff check --exclude ai_model/tooling/vendor --fix ai_model/inference ai_model/tooling tools

build:
	cd frontend && npm run build
	cd backend && go build -o /tmp/driftledger-api-verify ./cmd/api
	$(VENV)/bin/python -m compileall -q ai_model/inference ai_model/tooling tools
	docker compose config --quiet
	docker compose -f docker-compose.yml -f deploy/compose/gpu.yml config --quiet

verify: lint test build
	cd frontend && npm audit --audit-level=high
	$(VENV)/bin/pip-audit --requirement ai_model/inference/requirements.txt
	cd backend && go run golang.org/x/vuln/cmd/govulncheck@v1.1.4 ./...

model-build:
	$(PYTHON) ai_model/tooling/build_q4km_model.py

model-check:
	$(PYTHON) tools/verification/check_local_drift_setup.py
	$(PYTHON) tools/verification/test_q4km_config.py

model-smoke:
	$(VENV)/bin/python tools/verification/smoke_inference.py

model-eval:
	$(VENV)/bin/python tools/verification/evaluate_q4_quality.py

model-benchmark:
	$(VENV)/bin/python tools/verification/evaluate_raw_model.py --resume
