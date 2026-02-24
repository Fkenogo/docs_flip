'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import FlipbookViewer from '@/components/FlipbookViewer';

// Renders the owner-only preview route used before a document is published.
export default function DashboardPreviewPage() {
  const params = useParams();
  const documentId = params?.documentId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentData, setDocumentData] = useState(null);
  const [uid, setUid] = useState(null);

  // Tracks auth state so only the owner can preview draft documents.
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });
  }, []);

  // Loads the requested document and verifies ownership.
  useEffect(() => {
    if (!documentId) return;

    let mounted = true;

    async function loadPreview() {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, 'documents', documentId));

        if (!snap.exists()) {
          if (mounted) setError('Document not found.');
          return;
        }

        const data = snap.data();
        if (!uid) {
          if (mounted) setError('Login required to preview this document.');
          return;
        }

        if (data.userId !== uid) {
          if (mounted) setError('You do not have permission to preview this document.');
          return;
        }

        if (mounted) {
          setDocumentData(data);
          setError('');
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load preview.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPreview();
    return () => {
      mounted = false;
    };
  }, [documentId, uid]);

  if (loading) return <main>Loading preview...</main>;
  if (error) return <main>{error}</main>;
  if (!documentData) return <main>Preview unavailable.</main>;

  return (
    <FlipbookViewer
      pageUrls={documentData.pageUrls || []}
      title={`${documentData.title} (Preview)`}
      logoUrl={documentData.logoUrl}
      brandColor={documentData.brandColor}
      showBranding={documentData.showBranding}
      onPageTurn={() => {}}
    />
  );
}
