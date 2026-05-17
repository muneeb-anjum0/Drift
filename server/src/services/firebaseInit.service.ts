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
        console.log(`✓ Collection created: ${collection.name}`);
      } else {
        console.log(`✓ Collection already exists: ${collection.name}`);
      }
    } catch (error) {
      console.error(`✗ Error initializing collection ${collection.name}:`, error);
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
  description: string;
  owner: string; // user id
  members: string[]; // array of user ids
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreProject {
  _id: string;
  name: string;
  description: string;
  workspace: string; // workspace id
  owner: string; // user id
  status: 'active' | 'archived' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreRequirement {
  _id: string;
  project: string; // project id
  title: string;
  description: string;
  status: 'active' | 'deprecated' | 'replaced';
  version: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreDriftAnalysis {
  _id: string;
  project: string; // project id
  requirement: string; // requirement id
  baseline: string; // baseline requirement snapshot
  input: string; // current input text
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
    ambiguous: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreChangeRequest {
  _id: string;
  project: string; // project id
  driftAnalysis: string; // drift analysis id
  title: string;
  description: string;
  estimatedEffort: 'low' | 'medium' | 'high' | 'complex';
  estimatedTimeline: string;
  costImpact: string;
  status: 'open' | 'approved' | 'in_progress' | 'completed' | 'rejected';
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
  metadata: Record<string, any>;
  createdAt: Date;
}
