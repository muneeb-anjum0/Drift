export interface ProjectFormValues {
  workspaceId: string;
  name: string;
  clientName: string;
  description: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  originalScope: string;
  deadline: string;
}
