import { z } from 'zod';

const deadlineSchema = z.union([z.string().datetime(), z.string().min(1)]).optional();

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace is required'),
  name: z.string().trim().min(2, 'Project name is required'),
  clientName: z.string().trim().min(2, 'Client name is required'),
  description: z.string().trim().max(2000).optional().default(''),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'archived']).optional().default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  originalScope: z.string().trim().max(4000).optional().default(''),
  deadline: deadlineSchema,
});

export const updateProjectSchema = createProjectSchema.omit({ workspaceId: true }).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);
