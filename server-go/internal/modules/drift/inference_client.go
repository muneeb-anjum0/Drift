package drift

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"

	"driftledger/server-go/internal/config"
)

var ErrInferenceUnavailable = errors.New("drift inference service unavailable")
var ErrInferenceBadResponse = errors.New("drift inference service returned an invalid response")

const (
	maxInferenceResponseBytes = 64 << 10
	maxInferenceReasoning     = 4000
	maxChangedElements        = 50
	maxChangedElementLength   = 500
)

type InferenceClient struct {
	enabled            bool
	baseURL            string
	client             *http.Client
	relevanceThreshold float64
	maxAnalyzed        int
	apiKey             string
}

type ModelAnalyzeRequest struct {
	BaselineRequirement string `json:"baseline_requirement" validate:"required,max=12000"`
	NewClientMessage    string `json:"new_client_message" validate:"required,max=12000"`
}

type ModelPrediction struct {
	Label           string   `json:"label"`
	Confidence      float64  `json:"confidence"`
	Reasoning       string   `json:"reasoning"`
	ChangedElements []string `json:"changed_elements"`
}

func NewInferenceClient(cfg config.Config) InferenceClient {
	return InferenceClient{
		enabled:            cfg.DriftInferenceEnabled,
		baseURL:            strings.TrimRight(cfg.DriftInferenceURL, "/"),
		client:             &http.Client{Timeout: cfg.DriftInferenceTimeout},
		relevanceThreshold: cfg.DriftRelevanceThreshold,
		maxAnalyzed:        cfg.DriftMaxAnalyzedRequirements,
		apiKey:             cfg.DriftInferenceAPIKey,
	}
}

func (c InferenceClient) Enabled() bool {
	return c.enabled
}

func (c InferenceClient) RelevanceThreshold() float64 {
	if c.relevanceThreshold <= 0 {
		return 0.25
	}
	return c.relevanceThreshold
}

func (c InferenceClient) MaxAnalyzedRequirements() int {
	if c.maxAnalyzed <= 0 {
		return 3
	}
	return c.maxAnalyzed
}

func (c InferenceClient) Predict(ctx context.Context, payload ModelAnalyzeRequest) (ModelPrediction, error) {
	if !c.enabled {
		return ModelPrediction{}, ErrInferenceUnavailable
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return ModelPrediction{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/predict-drift", bytes.NewReader(body))
	if err != nil {
		return ModelPrediction{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Drift-Inference-Key", c.apiKey)
	resp, err := c.client.Do(req)
	if err != nil {
		return ModelPrediction{}, fmt.Errorf("%w: %v", ErrInferenceUnavailable, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return ModelPrediction{}, fmt.Errorf("%w: status %d", ErrInferenceUnavailable, resp.StatusCode)
	}
	var wire struct {
		Label           string    `json:"label"`
		Confidence      *float64  `json:"confidence"`
		Reasoning       *string   `json:"reasoning"`
		ChangedElements *[]string `json:"changed_elements"`
	}
	decoder := json.NewDecoder(io.LimitReader(resp.Body, maxInferenceResponseBytes+1))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&wire); err != nil {
		return ModelPrediction{}, fmt.Errorf("%w: %v", ErrInferenceBadResponse, err)
	}
	if err := ensureJSONEOF(decoder); err != nil {
		return ModelPrediction{}, fmt.Errorf("%w: %v", ErrInferenceBadResponse, err)
	}
	if !validModelLabel(wire.Label) {
		return ModelPrediction{}, fmt.Errorf("%w: invalid label %q", ErrInferenceBadResponse, wire.Label)
	}
	if wire.Confidence == nil || wire.Reasoning == nil || wire.ChangedElements == nil {
		return ModelPrediction{}, fmt.Errorf("%w: missing required fields", ErrInferenceBadResponse)
	}
	confidence := *wire.Confidence
	if math.IsNaN(confidence) || math.IsInf(confidence, 0) || confidence < 0 || confidence > 100 {
		return ModelPrediction{}, fmt.Errorf("%w: confidence is out of range", ErrInferenceBadResponse)
	}
	if confidence > 1 {
		confidence /= 100
	}
	if len(*wire.Reasoning) > maxInferenceReasoning || len(*wire.ChangedElements) > maxChangedElements {
		return ModelPrediction{}, fmt.Errorf("%w: generated fields exceed limits", ErrInferenceBadResponse)
	}
	for _, element := range *wire.ChangedElements {
		if len(element) > maxChangedElementLength {
			return ModelPrediction{}, fmt.Errorf("%w: changed element exceeds limit", ErrInferenceBadResponse)
		}
	}
	return ModelPrediction{Label: wire.Label, Confidence: confidence, Reasoning: *wire.Reasoning, ChangedElements: *wire.ChangedElements}, nil
}

func ensureJSONEOF(decoder *json.Decoder) error {
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		if err == nil {
			return errors.New("multiple JSON values")
		}
		return err
	}
	return nil
}

func (c InferenceClient) Health(ctx context.Context) error {
	if !c.enabled {
		return ErrInferenceUnavailable
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/health", nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-Drift-Inference-Key", c.apiKey)
	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrInferenceUnavailable, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("%w: status %d", ErrInferenceUnavailable, resp.StatusCode)
	}
	return nil
}

func validModelLabel(label string) bool {
	switch strings.ToLower(strings.TrimSpace(label)) {
	case "added", "modified", "removed", "contradiction", "ambiguous", "unchanged":
		return true
	default:
		return false
	}
}

func predictionToChanges(pred ModelPrediction, inputText string) []DetectedChange {
	label := strings.ToLower(strings.TrimSpace(pred.Label))
	if label == "unchanged" {
		return []DetectedChange{}
	}
	confidence := int(pred.Confidence * 100)
	if confidence == 0 {
		confidence = 1
	}
	impact := impact(label, strings.ToLower(inputText+" "+strings.Join(pred.ChangedElements, " ")))
	effort := effort(impact)
	titleText := title(inputText)
	if len(pred.ChangedElements) > 0 {
		titleText = title(sanitizeChangedElementTitle(pred.ChangedElements[0], label, inputText))
	}
	return []DetectedChange{{
		ChangeType:      label,
		Title:           titleText,
		Description:     pred.Reasoning,
		NewText:         inputText,
		Impact:          impact,
		EstimatedEffort: &effort,
		Confidence:      confidence,
		Recommendation:  recommendation(label, titleText),
	}}
}

func sanitizeChangedElementTitle(element, label, fallback string) string {
	cleaned := strings.TrimSpace(element)
	lower := strings.ToLower(cleaned)
	for _, status := range []string{"added", "modified", "removed", "contradiction", "ambiguous", "unchanged"} {
		suffix := " (" + status + ")"
		if strings.HasSuffix(lower, suffix) {
			cleaned = strings.TrimSpace(cleaned[:len(cleaned)-len(suffix)])
			break
		}
	}
	if cleaned == "" || strings.EqualFold(cleaned, label) {
		return fallback
	}
	return cleaned
}
