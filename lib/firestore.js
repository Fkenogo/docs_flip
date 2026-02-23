// Centralizes Firestore helper functions used across the app.
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';

// Returns a query for a user's documents sorted by newest first.
export function getUserDocumentsQuery(userId) {
  return query(
    collection(db, 'documents'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
}
