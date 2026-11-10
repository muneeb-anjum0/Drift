package drift

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

// Research-only replay of the unchanged production PP1 Go functions.
// It is opt-in and skips normal CI without the two environment paths.
func TestPhase3I5PP1Replay(t *testing.T) {
	inputDir := os.Getenv("DRIFT_PHASE3I5_INPUT_DIR")
	outputPath := os.Getenv("DRIFT_PHASE3I5_OUTPUT")
	if inputDir == "" && outputPath == "" {
		t.Skip("Phase III-I.5 offline replay paths not supplied")
	}
	if inputDir == "" || outputPath == "" {
		t.Fatal("both Phase III-I.5 replay paths are required")
	}
	type rawCase struct {
		CaseID              string `json:"case_id"`
		Message             string `json:"message"`
		ReviewedGroundTruth string `json:"reviewed_ground_truth"`
		PrimaryScored       bool   `json:"primary_scored"`
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
	if len(names) != 216 {
		t.Fatalf("expected 216 recorded cases, got %d", len(names))
	}
	rows := make([]replayCase, 0, len(names))
	counts := map[string]int{"FIXED": 0, "WORSENED": 0, "NEUTRAL": 0}
	changedLabels := 0
	scored := 0
	for _, name := range names {
		data, err := os.ReadFile(filepath.Join(inputDir, name))
		if err != nil {
			t.Fatal(err)
		}
		var item rawCase
		if err := json.Unmarshal(data, &item); err != nil {
			t.Fatal(err)
		}
		if item.CaseID == "" || item.Message == "" || (item.PrimaryScored && item.ReviewedGroundTruth == "") ||
			(!item.PrimaryScored && item.ReviewedGroundTruth != "") {
			t.Fatalf("incomplete or contradictory review eligibility: %s", name)
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
		changed := item.RawPredictedClass != pp1Label
		if changed {
			changedLabels++
		}
		effect := "UNSCORED"
		if item.PrimaryScored {
			scored++
			effect = "NEUTRAL"
			if item.RawPredictedClass != item.ReviewedGroundTruth && pp1Label == item.ReviewedGroundTruth {
				effect = "FIXED"
			} else if item.RawPredictedClass == item.ReviewedGroundTruth && pp1Label != item.ReviewedGroundTruth {
				effect = "WORSENED"
			}
			counts[effect]++
		}
		rows = append(rows, replayCase{
			CaseID: item.CaseID, Truth: item.ReviewedGroundTruth,
			RawLabel: item.RawPredictedClass, PP1Label: pp1Label,
			Effect: effect, Changed: changed,
		})
	}
	if scored != 215 {
		t.Fatalf("expected 215 scored cases, got %d", scored)
	}
	report := struct {
		Role          string         `json:"role"`
		Rows          []replayCase   `json:"rows"`
		ScoredRows    int            `json:"scored_rows"`
		EffectCounts  map[string]int `json:"effect_counts"`
		ChangedLabels int            `json:"changed_labels"`
	}{
		Role: "PHASE_III_I_5_FROZEN_GO_PP1_REPLAY",
		Rows: rows, ScoredRows: scored, EffectCounts: counts, ChangedLabels: changedLabels,
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
	t.Logf("Phase III-I.5 PP1 replay: scored=%d effects=%v changed_labels=%d", scored, counts, changedLabels)
}
