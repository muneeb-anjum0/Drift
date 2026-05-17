import { firestore } from '../config/firebase.js';

export interface FirestoreDocument {
  id?: string;
  [key: string]: any;
}

export const firestoreService = {
  async create(collection: string, data: FirestoreDocument) {
    const docRef = await firestore.collection(collection).add(data);
    return { id: docRef.id, ...data };
  },

  async get(collection: string, docId: string) {
    const doc = await firestore.collection(collection).doc(docId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async query(collection: string, conditions: Array<[string, string, any]> = []) {
    let query: FirebaseFirestore.Query = firestore.collection(collection);

    for (const [field, operator, value] of conditions) {
      query = query.where(field, operator as FirebaseFirestore.WhereFilterOp, value);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async update(collection: string, docId: string, data: Partial<FirestoreDocument>) {
    await firestore.collection(collection).doc(docId).update(data);
    const doc = await firestore.collection(collection).doc(docId).get();
    return { id: doc.id, ...doc.data() };
  },

  async delete(collection: string, docId: string) {
    await firestore.collection(collection).doc(docId).delete();
  },

  async batch(operations: Array<{ type: 'set' | 'update' | 'delete'; collection: string; docId: string; data?: any }>) {
    const batch = firestore.batch();

    for (const op of operations) {
      const ref = firestore.collection(op.collection).doc(op.docId);
      if (op.type === 'set') batch.set(ref, op.data);
      else if (op.type === 'update') batch.update(ref, op.data);
      else if (op.type === 'delete') batch.delete(ref);
    }

    await batch.commit();
  },
};
