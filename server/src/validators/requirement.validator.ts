import { z } from 'zod';

const requirementTypeSchema = z.enum(['functional', 'non_functional', 'business', 'technical', 'ui_ux', 'security', 'performance', 'integration', 'other']);
const requirementPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const requirementStatusSchema = z.enum(['proposed', 'approved', 'in_progress', 'completed', 'rejected', 'changed']);
const requirementSourceSchema = z.enum(['original_scope', 'manual', 'client_message', 'meeting_note', 'document', 'ai_extracted']);
const stringArraySchema = z.array(z.string().trim().min(1)).optional().default([]);

export const createRequirementSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  workspaceId: z.string().min(1).optional(),
  title: z.string().trim().min(2, 'Requirement title is required').max(150),
  description: z.string().trim().min(2, 'Requirement description is required'),
  type: requirementTypeSchema.optional().default('functional'),
  priority: requirementPrioritySchema.optional().default('medium'),
  status: requirementStatusSchema.optional().default('proposed'),
  source: requirementSourceSchema.optional().default('manual'),
  sourceText: z.string().trim().optional().default(''),
  acceptanceCriteria: stringArraySchema,
  tags: stringArraySchema,
  estimatedEffort: z.number().min(0).optional(),
});

export const updateRequirementSchema = createRequirementSchema
  .omit({ projectId: true, workspaceId: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

export const extractRequirementsSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  sourceText: z.string().trim().min(1, 'Source text is required'),
  source: requirementSourceSchema.optional().default('original_scope'),
});

export const createRequirementBaselineSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  label: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
});
