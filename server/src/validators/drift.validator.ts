import { z } from 'zod';

const driftInputTypeSchema = z.enum(['client_message', 'meeting_note', 'scope_update', 'document_text', 'other']);
const driftChangeTypeSchema = z.enum(['added', 'modified', 'removed', 'ambiguous', 'contradiction', 'unchanged']);
const driftImpactSchema = z.enum(['low', 'medium', 'high', 'critical']);
const riskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
const analysisEngineSchema = z.enum(['rule_based', 'ollama', 'hybrid']);

const detectedChangeSchema = z.object({
  changeType: driftChangeTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  baselineRequirementId: z.string().min(1).optional(),
  baselineRequirementTitle: z.string().trim().min(1).optional(),
  newText: z.string().trim().min(1).optional(),
  oldText: z.string().trim().min(1).optional(),
  impact: driftImpactSchema,
  estimatedEffort: z.number().min(0).optional(),
  confidence: z.number().min(0).max(100),
  recommendation: z.string().trim().min(1),
});

export const analyzeDriftSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  baselineVersionId: z.string().min(1, 'Baseline version is required'),
  inputType: driftInputTypeSchema.optional().default('client_message'),
  inputText: z.string().trim().min(1, 'Input text is required'),
  ollamaModel: z.string().trim().min(1).optional(),
});

export const saveDriftAnalysisSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  baselineVersionId: z.string().min(1, 'Baseline version is required'),
  inputType: driftInputTypeSchema.optional().default('client_message'),
  inputText: z.string().trim().min(1, 'Input text is required'),
  detectedChanges: z.array(detectedChangeSchema),
  driftScore: z.number().min(0).max(100),
  riskLevel: riskLevelSchema,
  summary: z.string().trim().min(1),
  addedCount: z.number().int().min(0),
  modifiedCount: z.number().int().min(0),
  removedCount: z.number().int().min(0),
  ambiguousCount: z.number().int().min(0),
  contradictionCount: z.number().int().min(0),
  estimatedExtraHours: z.number().min(0),
  analysisEngine: analysisEngineSchema,
  ollamaUsed: z.boolean(),
  ollamaModel: z.string().trim().min(1).nullable().optional(),
  status: z.enum(['draft', 'saved', 'reviewed']).optional().default('saved'),
});
