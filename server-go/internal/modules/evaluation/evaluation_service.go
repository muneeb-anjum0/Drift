package evaluation

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const defaultReportDir = "reports/evaluation"

var ErrNoReports = errors.New("no evaluation reports found")

type Service struct {
	reportDir string
	db        *mongo.Database
}

func NewService(db ...*mongo.Database) Service {
	reportDir := strings.TrimSpace(os.Getenv("DRIFT_EVALUATION_REPORT_DIR"))
	if reportDir == "" {
		reportDir = defaultReportDir
	}
	var database *mongo.Database
	if len(db) > 0 {
		database = db[0]
	}
	return Service{reportDir: filepath.Clean(reportDir), db: database}
}

func (s Service) Summary(ctx context.Context, userID primitive.ObjectID) (Summary, error) {
	reports, err := s.Reports()
	if err != nil {
		return Summary{}, err
	}
	approvalQuality, err := s.approvalQuality(ctx, userID)
	if err != nil {
		return Summary{}, err
	}
	if len(reports) == 0 {
		return Summary{HasReport: false, Reports: reports, Cases: []CaseResult{}, ApprovalQuality: approvalQuality}, nil
	}
	report, err := s.readReport(reports[0].Name)
	if err != nil {
		return Summary{}, err
	}
	return Summary{
		HasReport:        true,
		LatestReportPath: reports[0].Path,
		GeneratedAt:      report.GeneratedAt,
		Model:            report.Model,
		PassCount:        report.PassCount,
		CaseCount:        report.CaseCount,
		PassRate:         report.PassRate,
		AverageLatencyMs: report.AverageLatencyMs,
		Recommendation:   report.Recommendation,
		Cases:            report.Cases,
		Reports:          reports,
		ApprovalQuality:  approvalQuality,
	}, nil
}

func (s Service) Latest() (Report, error) {
	reports, err := s.Reports()
	if err != nil {
		return Report{}, err
	}
	if len(reports) == 0 {
		return Report{}, ErrNoReports
	}
	return s.readReport(reports[0].Name)
}

func (s Service) Reports() ([]ReportFile, error) {
	entries, err := os.ReadDir(s.reportDir)
	if errors.Is(err, os.ErrNotExist) {
		return []ReportFile{}, nil
	}
	if err != nil {
		return nil, err
	}
	reports := make([]ReportFile, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			return nil, err
		}
		reports = append(reports, ReportFile{
			Name:      entry.Name(),
			Path:      filepath.ToSlash(filepath.Join(s.reportDir, entry.Name())),
			CreatedAt: info.ModTime().UTC().Format(time.RFC3339),
		})
	}
	sort.SliceStable(reports, func(i, j int) bool {
		return reports[i].CreatedAt > reports[j].CreatedAt
	})
	return reports, nil
}

func (s Service) readReport(name string) (Report, error) {
	cleanName := filepath.Base(name)
	if cleanName != name || !strings.HasSuffix(cleanName, ".json") {
		return Report{}, os.ErrPermission
	}
	body, err := os.ReadFile(filepath.Join(s.reportDir, cleanName))
	if err != nil {
		return Report{}, err
	}
	var report Report
	if err := json.Unmarshal(body, &report); err != nil {
		return Report{}, err
	}
	if report.Cases == nil {
		report.Cases = []CaseResult{}
	}
	return report, nil
}

func (s Service) approvalQuality(ctx context.Context, userID primitive.ObjectID) (ApprovalQuality, error) {
	if s.db == nil || userID.IsZero() {
		return ApprovalQuality{}, nil
	}
	workspaceIDs, err := s.workspaceIDs(ctx, userID)
	if err != nil {
		return ApprovalQuality{}, err
	}
	projectIDs, err := s.projectIDs(ctx, workspaceIDs)
	if err != nil {
		return ApprovalQuality{}, err
	}
	if len(projectIDs) == 0 {
		return ApprovalQuality{}, nil
	}
	filter := func(status string) bson.M {
		return bson.M{"project": bson.M{"$in": projectIDs}, "approvalStatus": status}
	}
	pending, err := s.db.Collection("changerequests").CountDocuments(ctx, filter("pending_approval"))
	if err != nil {
		return ApprovalQuality{}, err
	}
	approved, err := s.db.Collection("changerequests").CountDocuments(ctx, filter("approved"))
	if err != nil {
		return ApprovalQuality{}, err
	}
	rejected, err := s.db.Collection("changerequests").CountDocuments(ctx, filter("rejected"))
	if err != nil {
		return ApprovalQuality{}, err
	}
	needsRevision, err := s.db.Collection("changerequests").CountDocuments(ctx, filter("needs_revision"))
	if err != nil {
		return ApprovalQuality{}, err
	}
	return ApprovalQuality{Pending: pending, Approved: approved, Rejected: rejected, NeedsRevision: needsRevision}, nil
}

func (s Service) workspaceIDs(ctx context.Context, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	cursor, err := s.db.Collection("workspacemembers").Find(ctx, bson.M{"user": userID})
	if err != nil {
		return nil, err
	}
	var rows []struct {
		Workspace primitive.ObjectID `bson:"workspace"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	ids := make([]primitive.ObjectID, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.Workspace)
	}
	return ids, nil
}

func (s Service) projectIDs(ctx context.Context, workspaceIDs []primitive.ObjectID) ([]primitive.ObjectID, error) {
	if len(workspaceIDs) == 0 {
		return []primitive.ObjectID{}, nil
	}
	cursor, err := s.db.Collection("projects").Find(ctx, bson.M{"workspace": bson.M{"$in": workspaceIDs}})
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	ids := make([]primitive.ObjectID, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	return ids, nil
}
