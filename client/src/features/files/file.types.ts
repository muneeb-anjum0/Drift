import type { Project, User, Workspace } from '../../types';

export type DocumentType = 'client_brief' | 'contract' | 'meeting_note' | 'screenshot' | 'scope_document' | 'other';

export interface ProjectFile {
  _id: string;
  workspace: string | Pick<Workspace, '_id' | 'name' | 'slug'>;
  project: string | Pick<Project, '_id' | 'name'>;
  uploadedBy: string | Pick<User, '_id' | 'name' | 'email'>;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  bucket: string;
  publicUrl?: string;
  signedUrl?: string;
  documentType: DocumentType;
  createdAt: string;
  updatedAt: string;
}
