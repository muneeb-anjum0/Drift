package drift

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

// This opt-in research test replays frozen PP1 on recorded raw singleton outputs.
// Normal CI skips it unless both environment paths are explicitly provided.
func TestPhase3IPP1Replay(t *testing.T) {
	inputDir := os.Getenv("DRIFT_PHASE3I_INPUT_DIR")
	outputPath := os.Getenv("DRIFT_PHASE3I_OUTPUT")
	if inputDir == "" && outputPath == "" {
		t.Skip("Phase III-I offline replay paths not supplied")
	}
	if inputDir == "" || outputPath == "" {
		t.Fatal("both Phase III-I replay paths are required")
	}
	type rawCase struct {
		CaseID              string `json:"case_id"`
		Message             string `json:"message"`
		ReviewedGroundTruth string `json:"reviewed_ground_truth"`
		RawPredictedClass   string `json:"raw_predicted_class"`
		Validation          struct {
			Valid  bool            `json:"valid"`
			Parsed ModelPrediction `json:"parsed"`
		} `json:"validation"`
	}
	type replayCase struct {
		CaseID   string `json:"case_id"`
		Truth    string `json:"truth"`
		RawLabel string `json:"raw_label"`
		PP1Label string `json:"pp1_label"`
		Effect   string `json:"effect"`
		Changed  bool   `json:"changed"`
	}
	entries, err := os.ReadDir(inputDir)
	if err != nil {
		t.Fatal(err)
	}
	names := []string{}
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".json") && entry.Name() != "manifest.json" {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)
	if len(names) != 90 {
		t.Fatalf("expected 90 recorded cases, got %d", len(names))
	}
	rows := make([]replayCase, 0, len(names))
	counts := map[string]int{"FIXED": 0, "WORSENED": 0, "NEUTRAL": 0}
	changedLabels := 0
	for _, name := range names {
		data, err := os.ReadFile(filepath.Join(inputDir, name))
		if err != nil {
			t.Fatal(err)
		}
		var item rawCase
		if err := json.Unmarshal(data, &item); err != nil {
			t.Fatal(err)
		}
		if item.CaseID == "" || item.Message == "" || item.ReviewedGroundTruth == "" {
			t.Fatalf("incomplete case %s", name)
		}
		pp1Label := ""
		if item.Validation.Valid {
			if item.Validation.Parsed.Label != item.RawPredictedClass {
				t.Fatalf("raw label/parsed label mismatch: %s", item.CaseID)
			}
			changes := predictionToChanges(item.Validation.Parsed, item.Message)
			normalized := CleanDetectedChanges(changes, item.Message)
			switch len(normalized) {
			case 0:
				pp1Label = "unchanged"
			case 1:
				pp1Label = normalized[0].ChangeType
			default:
				t.Fatalf("singleton PP1 produced %d groups: %s", len(normalized), item.CaseID)
			}
		}
		rawCorrect := item.RawPredictedClass == item.ReviewedGroundTruth
		pp1Correct := pp1Label == item.ReviewedGroundTruth
		effect := "NEUTRAL"
		if !rawCorrect && pp1Correct {
			effect = "FIXED"
		} else if rawCorrect && !pp1Correct {
			effect = "WORSENED"
		}
		counts[effect]++
		if item.RawPredictedClass != pp1Label {
			changedLabels++
		}
		rows = append(rows, replayCase{
			CaseID: item.CaseID, Truth: item.ReviewedGroundTruth,
			RawLabel: item.RawPredictedClass, PP1Label: pp1Label,
			Effect: effect, Changed: item.RawPredictedClass != pp1Label,
		})
	}
	report := struct {
		Role          string         `json:"role"`
		Rows          []replayCase   `json:"rows"`
		EffectCounts  map[string]int `json:"effect_counts"`
		ChangedLabels int            `json:"changed_labels"`
	}{
		Role: "PHASE_III_I_FROZEN_GO_PP1_REPLAY",
		Rows: rows, EffectCounts: counts, ChangedLabels: changedLabels,
	}
	body, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	output, err := os.OpenFile(outputPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatal(err)
	}
	defer output.Close()
	if _, err := output.Write(append(body, '\n')); err != nil {
		t.Fatal(err)
	}
	t.Logf("Phase III-I PP1 replay: effects=%v changed_labels=%d", counts, changedLabels)
}
