.PHONY: setup run test test-integration test-e2e lint format build verify model-smoke model-eval

PYTHON ?= python3
VENV ?= .venv

setup:
	npm ci
	cd server-go && go mod download
	$(PYTHON) -m venv $(VENV)
	$(VENV)/bin/pip install --requirement services/inference/requirements-dev.txt

run:
	docker compose up -d --build db inference backend frontend

test:
	cd server-go && go test ./...
	$(VENV)/bin/python -m pytest services/inference/test_app.py

test-integration:
	@test -n "$(MONGO_TEST_URI)" || (echo "MONGO_TEST_URI is required" >&2; exit 2)
	cd server-go && go test -count=1 ./internal/integration

test-e2e:
	npm run test:e2e

lint:
	npm run lint
	@test -z "$$(cd server-go && gofmt -l .)" || (cd server-go && gofmt -l .; exit 1)
	cd server-go && go vet ./...
	$(VENV)/bin/ruff check services/inference tools

format:
	cd server-go && gofmt -w .
	$(VENV)/bin/ruff check --fix services/inference tools

build:
	npm run build
	cd server-go && go build -o /tmp/driftledger-api-verify ./cmd/api
	$(VENV)/bin/python -m compileall -q services/inference tools
	docker compose config --quiet
	docker compose -f docker-compose.yml -f docker-compose.gpu.yml config --quiet

verify: lint test build
	npm audit --audit-level=high
	$(VENV)/bin/pip-audit --requirement services/inference/requirements.txt
	cd server-go && go run golang.org/x/vuln/cmd/govulncheck@v1.1.4 ./...

model-smoke:
	$(VENV)/bin/python tools/smoke_inference.py

model-eval:
	$(VENV)/bin/python tools/evaluate_q4_quality.py
