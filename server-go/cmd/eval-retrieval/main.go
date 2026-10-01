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
	ID             string   `json:"id"`
	Score          float64  `json:"score"`
	IsRelevant     bool     `json:"is_relevant"`
	MatchedTerms   []string `json:"matched_terms"`
	MatchedDomains []string `json:"matched_domains"`
}

type queryResult struct {
	ProjectID        string              `json:"project_id"`
	ProjectSize      string              `json:"project_size"`
	QueryID          string              `json:"query_id"`
	ExpectedIDs      []string            `json:"expected_requirement_ids"`
	Ranked           []rankedRequirement `json:"ranked_requirements"`
	SelectedIDs      []string            `json:"selected_requirement_ids"`
	RecallAt1        float64             `json:"recall_at_1"`
	RecallAt3        float64             `json:"recall_at_3"`
	PrecisionAt3     float64             `json:"precision_at_3"`
	ReciprocalRank   float64             `json:"reciprocal_rank"`
	ModelInputRecall float64             `json:"model_input_recall"`
	AllReachedModel  bool                `json:"all_expected_reached_model"`
}

func overlap(expected []string, actual []string) int {
	wanted := make(map[string]struct{}, len(expected))
	for _, id := range expected {
		wanted[id] = struct{}{}
	}
	count := 0
	for _, id := range actual {
		if _, ok := wanted[id]; ok {
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
	digest := sha256.Sum256(raw)
	results := []queryResult{}
	for _, project := range data.Projects {
		for _, query := range project.Queries {
			ranked := make([]rankedRequirement, 0, len(project.Requirements))
			for _, item := range project.Requirements {
				score := drift.ScoreRequirementRelevance(requirement.RequirementSnapshot{
					RequirementID: item.ID,
					Title:         item.Title,
					Description:   item.Description,
				}, query.Message, data.Threshold)
				ranked = append(ranked, rankedRequirement{item.ID, score.Score, score.IsRelevant, score.MatchedTerms, score.MatchedDomains})
			}
			sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].Score > ranked[j].Score })
			selected := []string{}
			for _, item := range ranked {
				if item.IsRelevant && len(selected) < data.MaxSelected {
					selected = append(selected, item.ID)
				}
			}
			top1 := idsAt(ranked, 1)
			top3 := idsAt(ranked, 3)
			firstRank := 0
			for index, item := range ranked {
				if overlap(query.ExpectedIDs, []string{item.ID}) > 0 {
					firstRank = index + 1
					break
				}
			}
			modelHits := overlap(query.ExpectedIDs, selected)
			results = append(results, queryResult{
				ProjectID: project.ID, ProjectSize: project.Size, QueryID: query.ID,
				ExpectedIDs: query.ExpectedIDs, Ranked: ranked, SelectedIDs: selected,
				RecallAt1:        float64(overlap(query.ExpectedIDs, top1)) / float64(len(query.ExpectedIDs)),
				RecallAt3:        float64(overlap(query.ExpectedIDs, top3)) / float64(len(query.ExpectedIDs)),
				PrecisionAt3:     float64(overlap(query.ExpectedIDs, top3)) / float64(len(top3)),
				ReciprocalRank:   1 / float64(firstRank),
				ModelInputRecall: float64(modelHits) / float64(len(query.ExpectedIDs)),
				AllReachedModel:  modelHits == len(query.ExpectedIDs),
			})
		}
	}

	sums := map[string]float64{}
	allReached := 0
	selectedTotal := 0
	bySize := map[string]map[string]float64{}
	for _, result := range results {
		sums["recall_at_1"] += result.RecallAt1
		sums["recall_at_3"] += result.RecallAt3
		sums["precision_at_3"] += result.PrecisionAt3
		sums["mrr"] += result.ReciprocalRank
		sums["model_input_recall"] += result.ModelInputRecall
		selectedTotal += len(result.SelectedIDs)
		if result.AllReachedModel {
			allReached++
		}
		if bySize[result.ProjectSize] == nil {
			bySize[result.ProjectSize] = map[string]float64{"queries": 0, "model_input_recall_sum": 0, "all_reached": 0}
		}
		bySize[result.ProjectSize]["queries"]++
		bySize[result.ProjectSize]["model_input_recall_sum"] += result.ModelInputRecall
		if result.AllReachedModel {
			bySize[result.ProjectSize]["all_reached"]++
		}
	}
	count := float64(len(results))
	for _, values := range bySize {
		values["model_input_recall"] = values["model_input_recall_sum"] / values["queries"]
		values["all_reached_rate"] = values["all_reached"] / values["queries"]
		delete(values, "model_input_recall_sum")
	}
	report := map[string]any{
		"schema_version": 1,
		"evaluation_id":  *evaluationID,
		"generated_at":   time.Now().UTC().Format(time.RFC3339),
		"dataset":        map[string]any{"name": data.Name, "version": data.Version, "sha256": hex.EncodeToString(digest[:])},
		"configuration":  map[string]any{"threshold": data.Threshold, "max_selected": data.MaxSelected},
		"metrics": map[string]any{
			"query_count":                      len(results),
			"recall_at_1":                      sums["recall_at_1"] / count,
			"recall_at_3":                      sums["recall_at_3"] / count,
			"precision_at_3":                   sums["precision_at_3"] / count,
			"mrr":                              sums["mrr"] / count,
			"model_input_recall":               sums["model_input_recall"] / count,
			"all_expected_reached_model_count": allReached,
			"all_expected_reached_model_rate":  float64(allReached) / count,
			"average_selected_requirements":    float64(selectedTotal) / count,
			"by_project_size":                  bySize,
		},
		"results": results,
		"limitations": []string{
			"Synthetic prospective development corpus; human relevance labels were authored by one engineering agent.",
			"Recall@k ranks all requirements; model-input recall also applies the production threshold and three-item cap.",
			"This measures deterministic retrieval only and makes no model-quality claim.",
		},
	}
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
