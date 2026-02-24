'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logViewerEvent } from '@/lib/analytics';
import FlipbookViewer from '@/components/FlipbookViewer';

// Renders the public viewer route without requiring authentication.
export default function PublicViewPage() {
  const params = useParams();
  const documentId = params?.documentId;
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const maxPageReachedRef = useRef(1);
  const ownerUserIdRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentData, setDocumentData] = useState(null);

  // Loads the published document and records the viewer_opened event.
  useEffect(() => {
    if (!documentId) return;

    let mounted = true;

    async function loadDocument() {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, 'documents', documentId));

        if (!snap.exists()) {
          if (mounted) setError('Document not found.');
          return;
        }

        const data = snap.data();
        if (!data.published) {
          if (mounted) setError('Document is not published yet.');
          return;
        }

        if (mounted) {
          setDocumentData(data);
          ownerUserIdRef.current = data.userId || null;
          setError('');
        }

        await logViewerEvent({
          documentId,
          userId: data.userId || null,
          eventType: 'viewer_opened',
          sessionId,
        });
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load document.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDocument();

    return () => {
      mounted = false;
      logViewerEvent({
        documentId,
        userId: ownerUserIdRef.current,
        eventType: 'session_ended',
        sessionId,
        pagesReached: maxPageReachedRef.current,
      });
    };
  }, [documentId, sessionId]);

  if (loading) return <main>Loading document...</main>;
  if (error) return <main>{error}</main>;
  if (!documentData) return <main>Document unavailable.</main>;

  return (
    <FlipbookViewer
      pageUrls={documentData.pageUrls || []}
      title={documentData.title}
      logoUrl={documentData.logoUrl}
      brandColor={documentData.brandColor}
      showBranding={documentData.showBranding}
      onPageTurn={(page) => {
        maxPageReachedRef.current = Math.max(maxPageReachedRef.current, page);
        logViewerEvent({
          documentId,
          userId: ownerUserIdRef.current,
          eventType: 'page_turned',
          pageNumber: page,
          sessionId,
        });
      }}
    />
  );
}
