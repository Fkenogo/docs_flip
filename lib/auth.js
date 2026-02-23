// Wraps authentication actions so all auth logic is imported from one place.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Creates the auth user and corresponding Firestore user profile.
export async function registerUser(email, password, displayName, orgName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email,
    displayName,
    orgName,
    logoUrl: null,
    plan: 'pay-per-doc',
    currency: 'KES',
    workspaceActive: false,
    createdAt: serverTimestamp(),
  });

  return user;
}

// Signs in an existing user with email and password.
export function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Signs the current user out.
export function logoutUser() {
  return signOut(auth);
}
