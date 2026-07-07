export interface EvaluationModelInfo {
  label: string;
  quantization: string;
  runtime: string;
  health: string;
  modelLoaded: boolean;
  ggufModelPath: string;
}

export interface EvaluationCase {
  id: string;
  name: string;
  expectedLabel: string;
  actualLabel: string;
  score: number;
  impact: string;
  estimatedHours: number;
  latencyMs: number;
  passed: boolean;
  title: string;
  summary: string;
  reasoning: string;
  notes: string[];
}

export interface EvaluationReportFile {
  name: string;
  path: string;
  createdAt: string;
}

export interface ApprovalQuality {
  pending: number;
  approved: number;
  rejected: number;
  needsRevision: number;
  averageApprovedScore: number;
}

export interface EvaluationSummary {
  hasReport: boolean;
  latestReportPath?: string;
  generatedAt?: string;
  model: EvaluationModelInfo;
  passCount: number;
  caseCount: number;
  passRate: number;
  averageLatencyMs: number;
  recommendation?: string;
  cases: EvaluationCase[];
  reports: EvaluationReportFile[];
  approvalQuality: ApprovalQuality;
}
