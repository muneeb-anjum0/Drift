import { firestore } from '../config/firebase.js';

/**
 * Initialize Firestore collections with proper structure
 * Run this once during deployment setup
 */
export const initializeFirestoreCollections = async () => {
  const collections = [
    {
      name: 'users',
      docs: [],
    },
    {
      name: 'workspaces',
      docs: [],
    },
    {
      name: 'workspaceMembers',
      docs: [],
    },
    {
      name: 'projects',
      docs: [],
    },
    {
      name: 'requirements',
      docs: [],
    },
    {
      name: 'requirementVersions',
      docs: [],
    },
    {
      name: 'driftAnalyses',
      docs: [],
    },
    {
      name: 'changeRequests',
      docs: [],
    },
    {
      name: 'activities',
      docs: [],
    },
  ];

  console.log('Initializing Firestore collections...');

  for (const collection of collections) {
    try {
      // Create a hidden document to ensure collection exists
      const docRef = firestore.collection(collection.name).doc('_metadata');
      const doc = await docRef.get();

      if (!doc.exists) {
        await docRef.set({
          _initialized: true,
          _createdAt: new Date(),
        });
        console.log(`Collection created: ${collection.name}`);
      } else {
        console.log(`Collection already exists: ${collection.name}`);
      }
    } catch (error) {
      console.error(`Error initializing collection ${collection.name}:`, error);
    }
  }

  console.log('Firestore collections initialization complete!');
};

/**
 * Firestore Collection Schemas
 */

export interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreWorkspace {
  _id: string;
  name: string;
  slug: string;
  description: string;
  owner: string; // user id
  members: string[]; // array of user ids
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreProject {
  _id: string;
  workspace: string; // workspace id
  name: string;
  description: string;
  clientName: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  originalScope: string;
  deadline?: Date | null;
  createdBy: string; // user id
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreRequirement {
  _id: string;
  project: string; // project id
  workspace: string; // workspace id
  title: string;
  description: string;
  type: 'functional' | 'non_functional' | 'business' | 'technical' | 'ui_ux' | 'security' | 'performance' | 'integration' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'changed';
  source: 'original_scope' | 'manual' | 'client_message' | 'meeting_note' | 'document' | 'ai_extracted';
  sourceText: string;
  acceptanceCriteria: string[];
  tags: string[];
  estimatedEffort?: number | null;
  isBaseline: boolean;
  baselineVersion: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreRequirementSnapshot {
  requirementId: string;
  title: string;
  description: string;
  type: FirestoreRequirement['type'];
  priority: FirestoreRequirement['priority'];
  status: FirestoreRequirement['status'];
  source: FirestoreRequirement['source'];
  acceptanceCriteria: string[];
  tags: string[];
  estimatedEffort?: number | null;
}

export interface FirestoreRequirementVersion {
  _id: string;
  project: string;
  workspace: string;
  versionNumber: number;
  label: string;
  description: string;
  requirementsSnapshot: FirestoreRequirementSnapshot[];
  createdBy: string;
  createdAt: Date;
}

export interface FirestoreDriftAnalysis {
  _id: string;
  project: string;
  workspace: string;
  baselineVersion: string;
  baselineVersionNumber: number;
  inputType: 'client_message' | 'meeting_note' | 'scope_update' | 'document_text' | 'other';
  inputText: string;
  driftScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  detectedChanges: Array<Record<string, unknown>>;
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  ambiguousCount: number;
  contradictionCount: number;
  estimatedExtraHours: number;
  analysisEngine: 'rule_based' | 'ollama' | 'hybrid';
  ollamaUsed: boolean;
  ollamaModel?: string | null;
  status: 'draft' | 'saved' | 'reviewed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreChangeRequest {
  _id: string;
  project: string;
  workspace: string;
  driftAnalysis: string;
  title: string;
  clientName?: string;
  summary: string;
  changesRequested: Array<Record<string, unknown>>;
  businessReason: string;
  timelineImpact: string;
  costImpact: string;
  recommendedAction: string;
  approvalNote: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';
  generatedBy: 'rule_based' | 'ollama' | 'hybrid';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreActivity {
  _id: string;
  workspace: string; // workspace id
  user: string; // user id
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
