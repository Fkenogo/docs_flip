// Logs analytics events without interrupting user-facing flows on failure.
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Writes a viewer analytics event to Firestore and fails silently on errors.
export async function logViewerEvent({
  documentId,
  userId,
  eventType,
  pageNumber,
  sessionId,
  pagesReached,
}) {
  try {
    await addDoc(collection(db, 'analytics'), {
      documentId,
      userId: userId || null,
      eventType,
      pageNumber: pageNumber ?? null,
      pagesReached: pagesReached ?? null,
      sessionId,
      country: await getApproxCountry(),
      timestamp: serverTimestamp(),
    });
  } catch {
    // Intentionally ignored so analytics never block the core experience.
  }
}

// Fetches an approximate country from a lightweight IP lookup service.
async function getApproxCountry() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    return data.country_name || 'Unknown';
  } catch {
    return 'Unknown';
  }
}
