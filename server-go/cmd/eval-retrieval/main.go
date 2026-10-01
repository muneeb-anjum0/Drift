// Command eval-retrieval measures deterministic requirement retrieval without model inference.
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"driftledger/server-go/internal/modules/drift"
	"driftledger/server-go/internal/modules/requirement"
)

type dataset struct {
	Name        string    `json:"name"`
	Version     string    `json:"version"`
	Threshold   float64   `json:"threshold"`
	MaxSelected int       `json:"max_selected"`
	Projects    []project `json:"projects"`
}
type project struct {
	ID           string               `json:"id"`
	Size         string               `json:"size"`
	Requirements []datasetRequirement `json:"requirements"`
	Queries      []query              `json:"queries"`
}
type datasetRequirement struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}
type query struct {
	ID          string   `json:"id"`
	Message     string   `json:"message"`
	ExpectedIDs []string `json:"expected_requirement_ids"`
}

type rankedRequirement struct {
	ID       string               `json:"id"`
	Rank     int                  `json:"rank"`
	Expected bool                 `json:"expected"`
	Selected bool                 `json:"selected"`
	Decision string               `json:"decision"`
	Score    float64              `json:"score"`
	Trace    drift.RelevanceTrace `json:"trace"`
}
type queryResult struct {
	ProjectID        string              `json:"project_id"`
	ProjectSize      string              `json:"project_size"`
	QueryID          string              `json:"query_id"`
	Message          string              `json:"message"`
	ExpectedIDs      []string            `json:"expected_requirement_ids"`
	ExpectedCount    int                 `json:"expected_count"`
	CandidateCount   int                 `json:"candidate_count"`
	Ranked           []rankedRequirement `json:"ranked_requirements"`
	SelectedIDs      []string            `json:"selected_requirement_ids"`
	HitsAt1          int                 `json:"hits_at_1"`
	HitsAt3          int                 `json:"hits_at_3"`
	HitsAtK          int                 `json:"hits_at_k"`
	ModelHits        int                 `json:"model_hits"`
	FalseExposures   int                 `json:"false_exposures"`
	RecallAt1        *float64            `json:"recall_at_1"`
	RecallAt3        *float64            `json:"recall_at_3"`
	RecallAtK        *float64            `json:"recall_at_k"`
	PrecisionAt1     float64             `json:"precision_at_1"`
	PrecisionAt3     float64             `json:"precision_at_3"`
	PrecisionAtK     float64             `json:"precision_at_k"`
	ReciprocalRank   float64             `json:"reciprocal_rank"`
	ModelInputRecall *float64            `json:"model_input_recall"`
	AtLeastOne       bool                `json:"at_least_one_expected_reached_model"`
	AllReachedModel  bool                `json:"all_expected_reached_model"`
}

func contains(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}
func overlap(expected, actual []string) int {
	count := 0
	for _, id := range actual {
		if contains(expected, id) {
			count++
		}
	}
	return count
}
func idsAt(ranked []rankedRequirement, count int) []string {
	if count > len(ranked) {
		count = len(ranked)
	}
	ids := make([]string, 0, count)
	for _, item := range ranked[:count] {
		ids = append(ids, item.ID)
	}
	return ids
}
func ratio(numerator, denominator int) float64 {
	if denominator == 0 {
		return 0
	}
	return float64(numerator) / float64(denominator)
}
func optionalRatio(numerator, denominator int) *float64 {
	if denominator == 0 {
		return nil
	}
	value := ratio(numerator, denominator)
	return &value
}
func valueOf(value *float64) float64 {
	if value == nil {
		return 0
	}
	return *value
}

func main() {
	inputPath := flag.String("input", "../evaluation/datasets/retrieval_dev_v1.json", "retrieval dataset")
	outputPath := flag.String("output", "../evaluation/reports/retrieval_dev_v1.json", "retrieval report")
	evaluationID := flag.String("evaluation-id", "retrieval-dev-v1", "stable evaluation identifier")
	flag.Parse()
	raw, err := os.ReadFile(*inputPath)
	if err != nil {
		panic(err)
	}
	var data dataset
	if err := json.Unmarshal(raw, &data); err != nil {
		panic(err)
	}
	if data.MaxSelected < 1 {
		panic("max_selected must be positive")
	}
	digest := sha256.Sum256(raw)
	results := []queryResult{}
	started := time.Now()
	for _, project := range data.Projects {
		for _, query := range project.Queries {
			ranked := make([]rankedRequirement, 0, len(project.Requirements))
			for _, item := range project.Requirements {
				trace := drift.TraceRequirementRelevance(requirement.RequirementSnapshot{RequirementID: item.ID, Title: item.Title, Description: item.Description}, query.Message, data.Threshold)
				ranked = append(ranked, rankedRequirement{ID: item.ID, Expected: contains(query.ExpectedIDs, item.ID), Score: trace.Result.Score, Trace: trace})
			}
			sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].Score > ranked[j].Score })
			selected := []string{}
			for index := range ranked {
				ranked[index].Rank = index + 1
				switch {
				case !ranked[index].Trace.PassedThreshold:
					ranked[index].Decision = "BELOW_THRESHOLD"
				case !ranked[index].Trace.PassedSpecificGate:
					ranked[index].Decision = "FAILED_SPECIFIC_MATCH_GATE"
				case len(selected) >= data.MaxSelected:
					ranked[index].Decision = "TOP_K_EXCLUDED"
				default:
					ranked[index].Decision = "SELECTED"
					ranked[index].Selected = true
					selected = append(selected, ranked[index].ID)
				}
			}
			top1, top3, topK := idsAt(ranked, 1), idsAt(ranked, 3), idsAt(ranked, data.MaxSelected)
			firstRank := 0
			for index, item := range ranked {
				if item.Expected {
					firstRank = index + 1
					break
				}
			}
			rr := 0.0
			if firstRank > 0 {
				rr = 1 / float64(firstRank)
			}
			expectedCount := len(query.ExpectedIDs)
			modelHits := overlap(query.ExpectedIDs, selected)
			results = append(results, queryResult{ProjectID: project.ID, ProjectSize: project.Size, QueryID: query.ID, Message: query.Message, ExpectedIDs: query.ExpectedIDs, ExpectedCount: expectedCount, CandidateCount: len(ranked), Ranked: ranked, SelectedIDs: selected, HitsAt1: overlap(query.ExpectedIDs, top1), HitsAt3: overlap(query.ExpectedIDs, top3), HitsAtK: overlap(query.ExpectedIDs, topK), ModelHits: modelHits, FalseExposures: len(selected) - modelHits, RecallAt1: optionalRatio(overlap(query.ExpectedIDs, top1), expectedCount), RecallAt3: optionalRatio(overlap(query.ExpectedIDs, top3), expectedCount), RecallAtK: optionalRatio(overlap(query.ExpectedIDs, topK), expectedCount), PrecisionAt1: ratio(overlap(query.ExpectedIDs, top1), len(top1)), PrecisionAt3: ratio(overlap(query.ExpectedIDs, top3), len(top3)), PrecisionAtK: ratio(overlap(query.ExpectedIDs, topK), len(topK)), ReciprocalRank: rr, ModelInputRecall: optionalRatio(modelHits, expectedCount), AtLeastOne: modelHits > 0, AllReachedModel: expectedCount > 0 && modelHits == expectedCount})
		}
	}
	sums := map[string]float64{}
	all, reachedAny, positive, negative := 0, 0, 0, 0
	selectedTotal, candidateTotal, expectedTotal, hitTotal, falseTotal := 0, 0, 0, 0, 0
	bySize := map[string]map[string]float64{}
	for _, result := range results {
		selectedTotal += len(result.SelectedIDs)
		candidateTotal += result.CandidateCount
		expectedTotal += result.ExpectedCount
		hitTotal += result.ModelHits
		falseTotal += result.FalseExposures
		if result.ExpectedCount == 0 {
			negative++
		} else {
			positive++
			sums["r1"] += valueOf(result.RecallAt1)
			sums["r3"] += valueOf(result.RecallAt3)
			sums["rk"] += valueOf(result.RecallAtK)
			sums["mir"] += valueOf(result.ModelInputRecall)
			sums["mrr"] += result.ReciprocalRank
			if result.AtLeastOne {
				reachedAny++
			}
			if result.AllReachedModel {
				all++
			}
		}
		sums["p1"] += result.PrecisionAt1
		sums["p3"] += result.PrecisionAt3
		sums["pk"] += result.PrecisionAtK
		if bySize[result.ProjectSize] == nil {
			bySize[result.ProjectSize] = map[string]float64{}
		}
		bySize[result.ProjectSize]["queries"]++
		bySize[result.ProjectSize]["expected_requirements"] += float64(result.ExpectedCount)
		bySize[result.ProjectSize]["model_hits"] += float64(result.ModelHits)
		bySize[result.ProjectSize]["false_exposures"] += float64(result.FalseExposures)
	}
	for _, values := range bySize {
		values["model_input_micro_recall"] = values["model_hits"] / values["expected_requirements"]
	}
	queryCount := len(results)
	report := map[string]any{"schema_version": 2, "evaluation_id": *evaluationID, "generated_at": time.Now().UTC().Format(time.RFC3339), "dataset": map[string]any{"name": data.Name, "version": data.Version, "sha256": hex.EncodeToString(digest[:])}, "configuration": map[string]any{"threshold": data.Threshold, "max_selected": data.MaxSelected, "tie_breaking": "stable source order"}, "metrics": map[string]any{"query_count": queryCount, "positive_query_count": positive, "hard_negative_query_count": negative, "expected_requirement_count": expectedTotal, "model_hit_count": hitTotal, "recall_at_1_macro": sums["r1"] / float64(positive), "recall_at_3_macro": sums["r3"] / float64(positive), "recall_at_k_macro": sums["rk"] / float64(positive), "precision_at_1_macro": sums["p1"] / float64(queryCount), "precision_at_3_macro": sums["p3"] / float64(queryCount), "precision_at_k_macro": sums["pk"] / float64(queryCount), "mrr": sums["mrr"] / float64(positive), "model_input_recall_macro": sums["mir"] / float64(positive), "model_input_recall_micro": ratio(hitTotal, expectedTotal), "at_least_one_reached_count": reachedAny, "at_least_one_reached_rate": ratio(reachedAny, positive), "all_expected_reached_count": all, "all_expected_reached_rate": ratio(all, positive), "false_exposure_count": falseTotal, "average_selected_requirements": ratio(selectedTotal, queryCount), "average_candidate_requirements": ratio(candidateTotal, queryCount), "evaluation_duration_ms": time.Since(started).Milliseconds(), "by_project_size": bySize}, "results": results, "limitations": []string{"Synthetic prospective development corpus; labels were authored by one engineering agent.", "Recall@k ranks all requirements; model-input recall also applies the production threshold and selection cap.", "Null recall identifies zero-expected hard-negative queries.", "Wall-clock duration is observational, not a controlled benchmark.", "This measures deterministic retrieval only and makes no model-quality claim."}}
	encoded, err := json.MarshalIndent(report, "", "  ")
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
	fmt.Printf("wrote %s for %d queries\n", *outputPath, len(results))
}
