package ollama

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"driftledger/server-go/internal/config"
)

type Service struct {
	cfg    config.Config
	client *http.Client
}

func New(cfg config.Config) Service {
	return Service{cfg: cfg, client: &http.Client{Timeout: cfg.OllamaTimeout}}
}

func (s Service) Model(model string) string {
	if strings.TrimSpace(model) != "" {
		return model
	}
	return s.cfg.OllamaModel
}

func (s Service) EnhanceSummary(ctx context.Context, summary, model string) (string, bool) {
	if !s.cfg.OllamaEnabled {
		return "", false
	}
	prompt := "Rewrite this scope drift summary in one concise client-friendly sentence. Return only the sentence:\n" + summary
	text, ok := s.generate(ctx, prompt, s.Model(model))
	if !ok || strings.TrimSpace(text) == "" {
		return "", false
	}
	return strings.TrimSpace(text), true
}

func (s Service) EnhanceChangeRequest(ctx context.Context, draft map[string]any, model string) (map[string]any, bool) {
	if !s.cfg.OllamaEnabled {
		return nil, false
	}
	raw, _ := json.Marshal(draft)
	prompt := "Improve this change request JSON wording while preserving the same keys. Return valid JSON only:\n" + string(raw)
	text, ok := s.generate(ctx, prompt, s.Model(model))
	if !ok {
		return nil, false
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		return nil, false
	}
	return out, true
}

func (s Service) generate(ctx context.Context, prompt, model string) (string, bool) {
	body, _ := json.Marshal(map[string]any{"model": model, "prompt": prompt, "stream": false})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(s.cfg.OllamaBaseURL, "/")+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return "", false
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := s.client.Do(req)
	if err != nil {
		return "", false
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", false
	}
	var payload struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return "", false
	}
	return payload.Response, true
}
