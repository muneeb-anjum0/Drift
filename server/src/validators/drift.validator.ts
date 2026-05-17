import { z } from 'zod';

const inputTypeSchema = z.enum(['client_message', 'meeting_note', 'scope_update', 'document_text', 'other']);
const riskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
const changeTypeSchema = z.enum(['added', 'modified', 'removed', 'ambiguous', 'contradiction', 'unchanged']);
const impactSchema = z.enum(['low', 'medium', 'high', 'critical']);

const detectedChangeSchema = z.object({
  changeType: changeTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  baselineRequirementId: z.string().trim().optional(),
  baselineRequirementTitle: z.string().trim().optional(),
  newText: z.string().trim().optional(),
  oldText: z.string().trim().optional(),
  impact: impactSchema,
  estimatedEffort: z.number().min(0).optional(),
  confidence: z.number().min(0).max(100),
  recommendation: z.string().trim().min(1),
});

export const analyzeDriftSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  baselineVersionId: z.string().min(1, 'Baseline version is required'),
  inputText: z.string().trim().min(1, 'Input text is required'),
  inputType: inputTypeSchema.optional().default('client_message'),
  useOllama: z.boolean().optional().default(false),
  ollamaModel: z.string().trim().min(1).optional(),
});

export const saveDriftAnalysisSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  baselineVersionId: z.string().min(1, 'Baseline version is required'),
  inputText: z.string().trim().min(1, 'Input text is required'),
  inputType: inputTypeSchema.optional().default('client_message'),
  detectedChanges: z.array(detectedChangeSchema).min(1, 'Detected changes are required'),
  driftScore: z.number().min(0).max(100),
  riskLevel: riskLevelSchema,
  summary: z.string().trim().min(1),
  addedCount: z.number().min(0).optional().default(0),
  modifiedCount: z.number().min(0).optional().default(0),
  removedCount: z.number().min(0).optional().default(0),
  ambiguousCount: z.number().min(0).optional().default(0),
  contradictionCount: z.number().min(0).optional().default(0),
  estimatedExtraHours: z.number().min(0).optional().default(0),
  analysisEngine: z.enum(['rule_based', 'ollama', 'hybrid']).optional().default('rule_based'),
  ollamaUsed: z.boolean().optional().default(false),
  ollamaModel: z.string().trim().min(1).optional(),
  status: z.enum(['draft', 'saved', 'reviewed']).optional().default('saved'),
});

export const generateChangeRequestSchema = z.object({
  driftAnalysisId: z.string().min(1, 'Drift analysis is required'),
  useOllama: z.boolean().optional().default(false),
  ollamaModel: z.string().trim().min(1).optional(),
});

export const saveChangeRequestSchema = z.object({
  driftAnalysisId: z.string().min(1, 'Drift analysis is required'),
  title: z.string().trim().min(1, 'Title is required'),
  clientName: z.string().trim().optional().default(''),
  summary: z.string().trim().min(1, 'Summary is required'),
  changesRequested: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        changeType: z.enum(['added', 'modified', 'removed', 'ambiguous', 'contradiction']),
        impact: impactSchema,
        estimatedEffort: z.number().min(0).optional().default(0),
      })
    )
    .min(1, 'At least one requested change is required'),
  businessReason: z.string().trim().optional().default(''),
  timelineImpact: z.string().trim().optional().default(''),
  costImpact: z.string().trim().optional().default(''),
  recommendedAction: z.string().trim().optional().default(''),
  approvalNote: z.string().trim().optional().default(''),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'archived']).optional().default('draft'),
  generatedBy: z.enum(['rule_based', 'ollama', 'hybrid']).optional().default('rule_based'),
});

export const updateChangeRequestSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    summary: z.string().trim().min(1).optional(),
    businessReason: z.string().trim().optional(),
    timelineImpact: z.string().trim().optional(),
    costImpact: z.string().trim().optional(),
    recommendedAction: z.string().trim().optional(),
    approvalNote: z.string().trim().optional(),
    status: z.enum(['draft', 'sent', 'approved', 'rejected', 'archived']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });
