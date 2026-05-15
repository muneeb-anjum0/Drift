import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name is required'),
  description: z.string().trim().max(500).optional().default(''),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);
