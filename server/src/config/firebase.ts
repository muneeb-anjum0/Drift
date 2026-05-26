import { randomUUID } from 'crypto';
import admin from 'firebase-admin';
import { env } from './env.js';

type DocumentData = Record<string, unknown>;
type WhereOperator = '==';

class MemoryDocumentSnapshot {
  constructor(
    public readonly id: string,
    private readonly value: DocumentData | undefined,
    public readonly ref: MemoryDocumentReference
  ) {}

  get exists() {
    return Boolean(this.value);
  }

  data() {
    return this.value ? { ...this.value } : undefined;
  }
}

class MemoryQuerySnapshot {
  constructor(public readonly docs: MemoryDocumentSnapshot[]) {}

  get empty() {
    return this.docs.length === 0;
  }
}

class MemoryDocumentReference {
  constructor(
    private readonly db: MemoryFirestore,
    private readonly collectionName: string,
    public readonly id: string
  ) {}

  async get() {
    return new MemoryDocumentSnapshot(this.id, this.db.getDocument(this.collectionName, this.id), this);
  }

  async set(value: DocumentData) {
    this.db.setDocument(this.collectionName, this.id, { ...value });
  }

  async update(value: DocumentData) {
    const existing = this.db.getDocument(this.collectionName, this.id);
    if (!existing) {
      throw new Error(`Document not found: ${this.collectionName}/${this.id}`);
    }

    this.db.setDocument(this.collectionName, this.id, { ...existing, ...value });
  }

  async delete() {
    this.db.deleteDocument(this.collectionName, this.id);
  }
}

class MemoryQuery {
  private filters: Array<{ field: string; operator: WhereOperator; value: unknown }> = [];
  private maxResults: number | null = null;
  private sortBy: { field: string; direction: 'asc' | 'desc' } | null = null;

  constructor(
    private readonly db: MemoryFirestore,
    private readonly collectionName: string
  ) {}

  where(field: string, operator: WhereOperator, value: unknown) {
    this.filters.push({ field, operator, value });
    return this;
  }

  limit(count: number) {
    this.maxResults = count;
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    this.sortBy = { field, direction };
    return this;
  }

  async get() {
    let entries = this.db.getCollectionEntries(this.collectionName);

    for (const filter of this.filters) {
      entries = entries.filter(([, value]) => {
        if (filter.operator !== '==') return false;
        return value[filter.field] === filter.value;
      });
    }

    if (this.sortBy) {
      const { field, direction } = this.sortBy;
      entries = [...entries].sort(([, left], [, right]) => {
        const leftValue = getComparableValue(left[field]);
        const rightValue = getComparableValue(right[field]);
        return direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      });
    }

    if (this.maxResults !== null) {
      entries = entries.slice(0, this.maxResults);
    }

    return new MemoryQuerySnapshot(
      entries.map(([id, value]) => new MemoryDocumentSnapshot(id, value, new MemoryDocumentReference(this.db, this.collectionName, id)))
    );
  }
}

class MemoryCollectionReference extends MemoryQuery {
  constructor(
    private readonly memoryDb: MemoryFirestore,
    private readonly name: string
  ) {
    super(memoryDb, name);
  }

  doc(id = randomUUID()) {
    return new MemoryDocumentReference(this.memoryDb, this.name, id);
  }

  async add(value: DocumentData) {
    const ref = this.doc();
    await ref.set({ ...value, _id: value._id ?? ref.id });
    return ref;
  }
}

class MemoryWriteBatch {
  private operations: Array<() => Promise<void>> = [];

  update(ref: MemoryDocumentReference, value: DocumentData) {
    this.operations.push(() => ref.update(value));
  }

  delete(ref: MemoryDocumentReference) {
    this.operations.push(() => ref.delete());
  }

  async commit() {
    for (const operation of this.operations) {
      await operation();
    }
  }
}

class MemoryFirestore {
  private readonly collections = new Map<string, Map<string, DocumentData>>();

  collection(name: string) {
    this.ensureCollection(name);
    return new MemoryCollectionReference(this, name);
  }

  batch() {
    return new MemoryWriteBatch();
  }

  getDocument(collectionName: string, id: string) {
    return this.collections.get(collectionName)?.get(id);
  }

  setDocument(collectionName: string, id: string, value: DocumentData) {
    this.ensureCollection(collectionName).set(id, value);
  }

  deleteDocument(collectionName: string, id: string) {
    this.collections.get(collectionName)?.delete(id);
  }

  getCollectionEntries(collectionName: string) {
    return [...this.ensureCollection(collectionName).entries()];
  }

  private ensureCollection(name: string) {
    let collection = this.collections.get(name);
    if (!collection) {
      collection = new Map<string, DocumentData>();
      this.collections.set(name, collection);
    }

    return collection;
  }
}

const getComparableValue = (value: unknown) => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  if (typeof value === 'number') return value;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const hasServiceAccountCredentials = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);

if (hasServiceAccountCredentials && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
    }),
    projectId: env.FIREBASE_PROJECT_ID,
  });
}

const usingMemoryFirestore = !hasServiceAccountCredentials;

if (usingMemoryFirestore) {
  console.warn('Firebase service account env vars are missing. Using in-memory Firestore for local development.');
}

export const firestore = (usingMemoryFirestore ? new MemoryFirestore() : admin.firestore()) as FirebaseFirestore.Firestore;

export const auth = (usingMemoryFirestore
  ? {
      verifyIdToken: async () => {
        throw new Error('Firebase auth is unavailable in in-memory mode');
      },
    }
  : admin.auth()) as admin.auth.Auth;

export default admin;
