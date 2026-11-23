package drift

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"
)

func (c InferenceClient) AssessScope(ctx context.Context, system string, data []byte) (json.RawMessage, error) {
	if !c.enabled || len(data) == 0 || len(data) > 256<<10 {
		return nil, ErrInferenceUnavailable
	}
	body, _ := json.Marshal(map[string]string{"system": system, "data": string(data)})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/assess-scope", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Drift-Inference-Key", c.apiKey)
	resp, err := (&http.Client{Timeout: 210 * time.Second}).Do(req)
	if err != nil {
		return nil, ErrInferenceUnavailable
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, ErrInferenceUnavailable
	}
	var result struct {
		Assessment json.RawMessage `json:"assessment"`
	}
	if json.NewDecoder(io.LimitReader(resp.Body, 256<<10)).Decode(&result) != nil || !json.Valid(result.Assessment) {
		return nil, ErrInferenceBadResponse
	}
	return result.Assessment, nil
}
