export interface BillingSummary {
  planName: string;
  status: string;
  price: string;
  renewalDate: string;
  projects: number;
  savedAnalyses: number;
  changeRequests: number;
  approvals: number;
  evaluationPassRate: number;
  localInference: boolean;
  model: string;
  quantization: string;
  runtimeNote: string;
}
