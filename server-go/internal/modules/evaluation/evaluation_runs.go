package evaluation

import (
	"sync"
	"time"

	"driftledger/server-go/internal/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	runStatusQueued    = "queued"
	runStatusRunning   = "running"
	runStatusSucceeded = "succeeded"
	runStatusFailed    = "failed"
)

type runStore struct {
	mu   sync.RWMutex
	runs map[primitive.ObjectID]*EvaluationRun
}

var runs = runStore{runs: map[primitive.ObjectID]*EvaluationRun{}}

func startRun(userID primitive.ObjectID, totalCases int) EvaluationRun {
	now := time.Now().UTC().Format(time.RFC3339)
	run := &EvaluationRun{
		ID:           utils.NewID().Hex(),
		Status:       runStatusQueued,
		StartedBy:    userID.Hex(),
		StartedAt:    now,
		Progress:     0,
		TotalCases:   totalCases,
		CaseStatuses: benchmarkCaseStatuses(),
		CurrentStep:  "Waiting to start",
	}
	runs.mu.Lock()
	runs.runs[userID] = run
	runs.mu.Unlock()
	return cloneRun(run)
}

func currentRun(userID primitive.ObjectID) *EvaluationRun {
	runs.mu.RLock()
	defer runs.mu.RUnlock()
	run := runs.runs[userID]
	if run == nil {
		return nil
	}
	cloned := cloneRun(run)
	return &cloned
}

func mutateRun(userID primitive.ObjectID, update func(*EvaluationRun)) {
	runs.mu.Lock()
	defer runs.mu.Unlock()
	if run := runs.runs[userID]; run != nil {
		update(run)
	}
}

func cloneRun(run *EvaluationRun) EvaluationRun {
	if run == nil {
		return EvaluationRun{}
	}
	cloned := *run
	cloned.CaseStatuses = append([]RunCaseStatus(nil), run.CaseStatuses...)
	return cloned
}
