package drift

import "fmt"

func Score(changes []DetectedChange) (int, string, map[string]int, float64, string) {
	counts := map[string]int{"added": 0, "modified": 0, "removed": 0, "ambiguous": 0, "contradiction": 0}
	score := 0
	hours := 0.0
	for _, change := range changes {
		label := normalizeLabel(change.ChangeType)
		counts[label]++
		itemScore := 0
		switch label {
		case "added":
			itemScore = 14
		case "modified":
			itemScore = 10
		case "removed":
			itemScore = 28
		case "ambiguous":
			itemScore = 24
		case "contradiction":
			itemScore = 58
		}
		switch change.Impact {
		case "critical":
			itemScore += 24
		case "high":
			itemScore += 18
		case "medium":
			itemScore += 10
		}
		if change.EstimatedEffort != nil {
			hours += *change.EstimatedEffort
			if *change.EstimatedEffort >= 16 {
				itemScore += 12
			} else if *change.EstimatedEffort >= 8 {
				itemScore += 7
			} else if *change.EstimatedEffort >= 4 {
				itemScore += 3
			}
		}
		if len(change.AffectedModules) >= 4 {
			itemScore += 12
		} else if len(change.AffectedModules) >= 2 {
			itemScore += 6
		}
		if itemScore > score {
			score = itemScore
		}
	}
	if len(changes) > 1 {
		score += (len(changes) - 1) * 8
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
