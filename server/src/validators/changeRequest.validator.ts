import { z } from 'zod';

const statusSchema = z.enum(['draft', 'sent', 'approved', 'rejected', 'archived']);
const changeTypeSchema = z.enum(['added', 'modified', 'removed', 'ambiguous', 'contradiction']);
const impactSchema = z.enum(['low', 'medium', 'high', 'critical']);
const generatedBySchema = z.enum(['rule_based', 'ollama', 'hybrid']);

const changeSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  changeType: changeTypeSchema,
  impact: impactSchema,
  estimatedEffort: z.number().min(0).optional(),
});

const draftSchema = z.object({
  driftAnalysisId: z.string().min(1, 'Drift analysis is required'),
  title: z.string().trim().min(1),
  clientName: z.string().trim().default(''),
  summary: z.string().trim().min(1),
  changesRequested: z.array(changeSchema),
  businessReason: z.string().trim().min(1),
  timelineImpact: z.string().trim().min(1),
  costImpact: z.string().trim().min(1),
  recommendedAction: z.string().trim().min(1),
  approvalNote: z.string().trim().min(1),
  status: statusSchema.optional().default('draft'),
  generatedBy: generatedBySchema.optional().default('rule_based'),
});

export const generateChangeRequestSchema = z.object({
  driftAnalysisId: z.string().min(1, 'Drift analysis is required'),
  useOllama: z.boolean().optional().default(false),
  ollamaModel: z.string().trim().min(1).optional(),
});

export const saveChangeRequestSchema = draftSchema;

export const updateChangeRequestSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    clientName: z.string().trim().optional(),
    summary: z.string().trim().min(1).optional(),
    businessReason: z.string().trim().min(1).optional(),
    timelineImpact: z.string().trim().min(1).optional(),
    costImpact: z.string().trim().min(1).optional(),
    recommendedAction: z.string().trim().min(1).optional(),
    approvalNote: z.string().trim().min(1).optional(),
    status: statusSchema.optional(),
    generatedBy: generatedBySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });
