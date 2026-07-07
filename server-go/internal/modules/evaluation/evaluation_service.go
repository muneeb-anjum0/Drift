package evaluation

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const defaultReportDir = "reports/evaluation"

var ErrNoReports = errors.New("no evaluation reports found")

type Service struct {
	reportDir string
}

func NewService() Service {
	reportDir := strings.TrimSpace(os.Getenv("DRIFT_EVALUATION_REPORT_DIR"))
	if reportDir == "" {
		reportDir = defaultReportDir
	}
	return Service{reportDir: filepath.Clean(reportDir)}
}

func (s Service) Summary() (Summary, error) {
	reports, err := s.Reports()
	if err != nil {
		return Summary{}, err
	}
	if len(reports) == 0 {
		return Summary{HasReport: false, Reports: reports, Cases: []CaseResult{}}, nil
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
