// Command eval-postprocess measures the production postprocessor against a raw-model report.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"time"

	"driftledger/server-go/internal/modules/drift"
)

type prediction struct {
	Label           string   `json:"label"`
	Confidence      float64  `json:"confidence"`
	Reasoning       string   `json:"reasoning"`
	ChangedElements []string `json:"changed_elements"`
}

type rawCase struct {
	CaseID           string      `json:"case_id"`
	ClientMessage    string      `json:"client_message"`
	ExpectedLabel    string      `json:"expected_label"`
	ParsedPrediction *prediction `json:"parsed_prediction"`
}

type rawReport struct {
	EvaluationID   string         `json:"evaluation_id"`
	ArtifactSHA256 string         `json:"artifact_sha256"`
	Dataset        map[string]any `json:"dataset"`
	Results        []rawCase      `json:"results"`
}

type caseResult struct {
	CaseID        string `json:"case_id"`
	ExpectedLabel string `json:"expected_label"`
	RawLabel      string `json:"raw_label"`
	FinalLabel    string `json:"postprocessed_label"`
	Effect        string `json:"effect"`
	RawCorrect    bool   `json:"raw_correct"`
	FinalCorrect  bool   `json:"postprocessed_correct"`
}

type report struct {
	SchemaVersion  int            `json:"schema_version"`
	EvaluationID   string         `json:"evaluation_id"`
	GeneratedAt    string         `json:"generated_at"`
	Source         string         `json:"source_evaluation_id"`
	ArtifactSHA256 string         `json:"artifact_sha256"`
	Dataset        map[string]any `json:"dataset"`
	Metrics        map[string]any `json:"metrics"`
	Cases          []caseResult   `json:"cases"`
	Limitations    []string       `json:"limitations"`
}

func labelAfterPostprocess(item rawCase) string {
	if item.ParsedPrediction == nil {
		return "parse_error"
	}
	if item.ParsedPrediction.Label == "unchanged" {
		return "unchanged"
	}
	title := item.ClientMessage
	if len(item.ParsedPrediction.ChangedElements) > 0 {
		title = item.ParsedPrediction.ChangedElements[0]
	}
	confidence := int(math.Round(item.ParsedPrediction.Confidence * 100))
	changes := drift.CleanDetectedChanges([]drift.DetectedChange{{
		ChangeType:  item.ParsedPrediction.Label,
		Title:       title,
		Description: item.ParsedPrediction.Reasoning,
		NewText:     item.ClientMessage,
		Confidence:  confidence,
	}}, item.ClientMessage)
	if len(changes) == 0 {
		return "unchanged"
	}
	return changes[0].ChangeType
}

func main() {
	inputPath := flag.String("input", "/tmp/drift-phase3-reports/raw_model_dev_v1.json", "raw evaluation report")
	outputPath := flag.String("output", "evaluation/reports/postprocess_ablation_dev_v1.json", "ablation report")
	evaluationID := flag.String("evaluation-id", "postprocess-ablation-dev-v1", "stable evaluation identifier")
	flag.Parse()

	data, err := os.ReadFile(*inputPath)
	if err != nil {
		panic(err)
	}
	var source rawReport
	if err := json.Unmarshal(data, &source); err != nil {
		panic(err)
	}

	counts := map[string]int{
		"POSTPROCESSOR_CORRECTED_MODEL_ERROR":            0,
		"POSTPROCESSOR_INTRODUCED_ERROR":                 0,
		"POSTPROCESSOR_HAD_NO_EFFECT":                    0,
		"POSTPROCESSOR_CHANGED_WRONG_TO_DIFFERENT_WRONG": 0,
	}
	results := make([]caseResult, 0, len(source.Results))
	rawCorrect := 0
	finalCorrect := 0
	for _, item := range source.Results {
		rawLabel := "parse_error"
		if item.ParsedPrediction != nil {
			rawLabel = item.ParsedPrediction.Label
		}
		finalLabel := labelAfterPostprocess(item)
		rawOK := rawLabel == item.ExpectedLabel
		finalOK := finalLabel == item.ExpectedLabel
		effect := "POSTPROCESSOR_HAD_NO_EFFECT"
		switch {
		case !rawOK && finalOK:
			effect = "POSTPROCESSOR_CORRECTED_MODEL_ERROR"
		case rawOK && !finalOK:
			effect = "POSTPROCESSOR_INTRODUCED_ERROR"
		case !rawOK && !finalOK && rawLabel != finalLabel:
			effect = "POSTPROCESSOR_CHANGED_WRONG_TO_DIFFERENT_WRONG"
		}
		counts[effect]++
		if rawOK {
			rawCorrect++
		}
		if finalOK {
			finalCorrect++
		}
		results = append(results, caseResult{item.CaseID, item.ExpectedLabel, rawLabel, finalLabel, effect, rawOK, finalOK})
	}
	sort.Slice(results, func(i, j int) bool { return results[i].CaseID < results[j].CaseID })
	total := len(results)
	out := report{
		SchemaVersion:  1,
		EvaluationID:   *evaluationID,
		GeneratedAt:    time.Now().UTC().Format(time.RFC3339),
		Source:         source.EvaluationID,
		ArtifactSHA256: source.ArtifactSHA256,
		Dataset:        source.Dataset,
		Metrics: map[string]any{
			"case_count":                    total,
			"raw_correct":                   rawCorrect,
			"raw_accuracy":                  float64(rawCorrect) / float64(max(total, 1)),
			"postprocessed_correct":         finalCorrect,
			"postprocessed_accuracy":        float64(finalCorrect) / float64(max(total, 1)),
			"net_correct_case_contribution": finalCorrect - rawCorrect,
			"effect_counts":                 counts,
		},
		Cases: results,
		Limitations: []string{
			"This isolates CleanDetectedChanges on one atomic change derived from each raw prediction.",
			"It does not include retrieval, multi-requirement aggregation, scoring, or persistence.",
			"The development dataset is not proven held out from the unrecovered adapter training data.",
		},
	}
	encoded, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		panic(err)
	}
	if err := os.MkdirAll(filepath.Dir(*outputPath), 0o755); err != nil {
		panic(err)
	}
	temporary := *outputPath + ".tmp"
	if err := os.WriteFile(temporary, append(encoded, '\n'), 0o644); err != nil {
		panic(err)
	}
	if err := os.Rename(temporary, *outputPath); err != nil {
		panic(err)
	}
	fmt.Printf("wrote %s: raw=%d/%d postprocessed=%d/%d net=%+d\n", *outputPath, rawCorrect, total, finalCorrect, total, finalCorrect-rawCorrect)
}
