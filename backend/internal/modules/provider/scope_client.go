package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

// AssessScope sends a server-authored instruction and untrusted scope data to
// the selected online model. Only JSON is returned; the caller validates it.
func (c *Client) AssessScope(ctx context.Context, system string, data []byte) (json.RawMessage, error) {
	if c == nil || len(system) == 0 || len(data) == 0 || len(data) > 256<<10 {
		return nil, ErrProviderInvalidResponse
	}
	payload := map[string]any{"model": c.model, "response_format": map[string]string{"type": "json_object"}, "messages": []map[string]string{{"role": "system", "content": system}, {"role": "user", "content": string(data)}}}
	if providerIDForEndpoint(c.endpoint) == ProviderOpenAI {
		payload["max_completion_tokens"] = 8192
	} else {
		payload["max_tokens"] = 8192
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, ErrProviderUnavailable
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.key)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, ErrProviderUnavailable
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, ErrProviderAuthentication
	case http.StatusNotFound:
		return nil, ErrProviderModel
	case http.StatusTooManyRequests:
		return nil, ErrProviderRateLimited
	case http.StatusBadRequest, http.StatusUnprocessableEntity:
		return nil, ErrProviderRequestRejected
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, ErrProviderUnavailable
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, (256<<10)+1))
	if err != nil || len(raw) > 256<<10 {
		return nil, ErrProviderInvalidResponse
	}
	var envelope struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if json.Unmarshal(raw, &envelope) != nil || len(envelope.Choices) != 1 {
		return nil, ErrProviderInvalidResponse
	}
	content := strings.TrimSpace(envelope.Choices[0].Message.Content)
	if len(content) == 0 || len(content) > 240<<10 || !json.Valid([]byte(content)) {
		return nil, ErrProviderInvalidResponse
	}
	return json.RawMessage(content), nil
}
