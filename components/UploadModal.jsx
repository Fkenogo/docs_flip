'use client';

// Handles PDF upload, pre-upload page limit checks, and real-time status tracking.
import { useMemo, useState } from 'react';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, storage } from '@/lib/firebase';
import { getPdfUploadPath } from '@/lib/storage';

// Counts PDF pages from file content so oversized documents are blocked client-side.
function countPdfPages(file) {
  return file.arrayBuffer().then((buffer) => {
    const text = new TextDecoder('latin1').decode(buffer);
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 0;
  });
}

// Subscribes to document status updates so the UI updates in real time.
function listenToDocument(documentId, onUpdate) {
  return onSnapshot(doc(db, 'documents', documentId), (snapshot) => {
    if (snapshot.exists()) onUpdate(snapshot.data());
  });
}

export default function UploadModal() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const canSubmit = useMemo(() => file && title.trim() && !uploading, [file, title, uploading]);

  // Validates and uploads a PDF, then tracks conversion status through Firestore.
  async function handleUpload(event) {
    event.preventDefault();
    setMessage('');

    if (!file) {
      setMessage('Select a PDF file first.');
      return;
    }

    if (!auth.currentUser) {
      setMessage('You must be signed in to upload.');
      return;
    }

    setUploading(true);

    try {
      const pageCount = await countPdfPages(file);
      if (pageCount > 100) {
        setMessage('This PDF has more than 100 pages. Please upload a smaller file.');
        setUploading(false);
        return;
      }

      const userId = auth.currentUser.uid;
      const documentId = crypto.randomUUID();
      const storagePath = getPdfUploadPath(userId, documentId);

      await setDoc(doc(db, 'documents', documentId), {
        documentId,
        userId,
        title: title.trim(),
        folderName: null,
        status: 'uploading',
        pageCount: 0,
        pageUrls: [],
        pdfUrl: null,
        offlineZipUrl: null,
        tier: null,
        published: false,
        logoUrl: null,
        brandColor: '#1B4F8A',
        showBranding: true,
        views: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const unsubscribe = listenToDocument(documentId, (data) => {
        setStatus(data.status || 'uploading');
      });

      const uploadTask = uploadBytesResumable(ref(storage, storagePath), file, {
        contentType: 'application/pdf',
        customMetadata: { documentId, userId },
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(pct));
        },
        (error) => {
          setMessage(`Upload failed: ${error.message}`);
          setUploading(false);
          unsubscribe();
        },
        () => {
          setMessage('Upload complete. Converting PDF...');
          setUploading(false);
        }
      );
    } catch (error) {
      setMessage(`Upload setup failed: ${error.message}`);
      setUploading(false);
    }
  }

  return (
    <section>
      <h2>Upload New Document</h2>
      <form onSubmit={handleUpload}>
        <input
          type="text"
          placeholder="Document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button type="submit" disabled={!canSubmit}>
          {uploading ? 'Uploading...' : 'Upload PDF'}
        </button>
      </form>
      <p>Status: {status}</p>
      <p>Upload progress: {progress}%</p>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
