import { firestore } from '../config/firebase.js';
import { firestoreService } from './firestore.service.js';
import { ApiError } from '../utils/ApiError.js';
import type { SafeUser } from '../types/index.js';

const USERS_COLLECTION = 'users';

interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ensureUserExists = async (uid: string, email: string, displayName?: string) => {
  const userRef = firestore.collection(USERS_COLLECTION).doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    const now = new Date();
    await userRef.set({
      uid,
      email,
      displayName: displayName || '',
      photoURL: '',
      createdAt: now,
      updatedAt: now,
    });
  }

  return userRef;
};

export const getCurrentUser = async (userId: string): Promise<SafeUser> => {
  const userRef = firestore.collection(USERS_COLLECTION).doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new ApiError(404, 'User not found');
  }

  const userData = userDoc.data() as FirebaseUser;
  return {
    _id: userData.uid,
    name: userData.displayName || '',
    email: userData.email || '',
    avatar: userData.photoURL || '',
    isEmailVerified: true, // Firebase handles verification
    createdAt: userData.createdAt instanceof Date ? userData.createdAt : new Date(userData.createdAt),
    updatedAt: userData.updatedAt instanceof Date ? userData.updatedAt : new Date(userData.updatedAt),
  };
};

export const updateUser = async (userId: string, updates: Partial<FirebaseUser>) => {
  const userRef = firestore.collection(USERS_COLLECTION).doc(userId);
  await userRef.update({
    ...updates,
    updatedAt: new Date(),
  });

  const updatedDoc = await userRef.get();
  const userData = updatedDoc.data() as FirebaseUser;
  return {
    _id: userData.uid,
    name: userData.displayName || '',
    email: userData.email || '',
    avatar: userData.photoURL || '',
    isEmailVerified: true,
    createdAt: userData.createdAt instanceof Date ? userData.createdAt : new Date(userData.createdAt),
    updatedAt: userData.updatedAt instanceof Date ? userData.updatedAt : new Date(userData.updatedAt),
  };
};
