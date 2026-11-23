package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"
)

// Scope responses are larger than the one-label credential check. Clone the
// existing restricted transport so DNS validation, TLS, and redirect policy
// stay identical while allowing the model enough time to finish.
func (c *Client) scopeHTTPClient() *http.Client {
	client := *c.http
	client.Timeout = 120 * time.Second
	if transport, ok := c.http.Transport.(*http.Transport); ok {
		copy := transport.Clone()
		copy.ResponseHeaderTimeout = 110 * time.Second
		client.Transport = copy
	}
	return &client
}

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
	resp, err := c.scopeHTTPClient().Do(req)
	if err != nil {
		var networkError net.Error
		if errors.Is(err, context.DeadlineExceeded) || errors.As(err, &networkError) && networkError.Timeout() {
			return nil, ErrProviderTimedOut
		}
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
		return nil, fmt.Errorf("%w: upstream HTTP %d", ErrProviderUnavailable, resp.StatusCode)
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
