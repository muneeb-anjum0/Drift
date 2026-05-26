package drift

import "fmt"

func Score(changes []DetectedChange) (int, string, map[string]int, float64, string) {
	counts := map[string]int{"added": 0, "modified": 0, "removed": 0, "ambiguous": 0, "contradiction": 0}
	score := 0
	hours := 0.0
	for _, change := range changes {
		counts[change.ChangeType]++
		switch change.ChangeType {
		case "added":
			score += 12
		case "modified":
			score += 10
		case "removed":
			score += 8
		case "ambiguous":
			score += 6
		case "contradiction":
			score += 15
		}
		if change.Impact == "high" {
			score += 8
		}
		if change.Impact == "critical" {
			score += 15
		}
		if change.EstimatedEffort != nil {
			hours += *change.EstimatedEffort
		}
	}
	if hours >= 30 {
		score += 20
	} else if hours >= 15 {
		score += 10
	} else if hours >= 5 {
		score += 5
	}
	if score > 100 {
		score = 100
	}
	risk := "low"
	if score > 75 {
		risk = "critical"
	} else if score > 50 {
		risk = "high"
	} else if score > 25 {
		risk = "medium"
	}
	summary := fmt.Sprintf("Detected %d scope change(s): %d added, %d modified, %d removed, %d ambiguous, and %d contradiction(s).", len(changes), counts["added"], counts["modified"], counts["removed"], counts["ambiguous"], counts["contradiction"])
	return score, risk, counts, hours, summary
}
