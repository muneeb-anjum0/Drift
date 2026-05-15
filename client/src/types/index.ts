export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  owner: string | Pick<User, '_id' | 'name' | 'email'>;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  workspace: string | Pick<Workspace, '_id' | 'name' | 'slug'>;
  name: string;
  clientName: string;
  description: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  originalScope: string;
  deadline?: string | null;
  createdBy: string | Pick<User, '_id' | 'name' | 'email'>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  _id: string;
  workspace: string | Pick<Workspace, '_id' | 'name' | 'slug'>;
  user: string | Pick<User, '_id' | 'name' | 'email'>;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
