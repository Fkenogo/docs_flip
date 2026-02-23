'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import UploadModal from '@/components/UploadModal';
import { auth } from '@/lib/firebase';
import { logoutUser } from '@/lib/auth';

// Renders the user dashboard and shows the current authentication state.
export default function DashboardPage() {
  const [email, setEmail] = useState(null);

  // Tracks auth state changes so upload access is visible to the user.
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setEmail(user?.email || null);
    });
  }, []);

  return (
    <main>
      <h1>Docsflip Dashboard</h1>
      {email ? (
        <p>
          Signed in as <strong>{email}</strong>{' '}
          <button type="button" onClick={logoutUser}>
            Sign out
          </button>
        </p>
      ) : (
        <p>
          You are not signed in. <Link href="/login">Login</Link> or{' '}
          <Link href="/register">Register</Link>.
        </p>
      )}
      <UploadModal />
    </main>
  );
}
