# DOCSFLIP — Technical Implementation Guide
### Step-by-step build specification for the AI Coding Agent

---

**Product:** Docsflip | docsflip.com  
**Stack:** Firebase (Auth · Firestore · Storage · Cloud Functions · Hosting) + Next.js + Flutterwave  
**Version:** Technical Implementation Guide v1.0  
**Companion:** Read alongside the MVP Product Brief v2.0 — both documents together define the complete build.

---

## How to Use This Document

This guide translates the MVP Product Brief into exact technical specifications — folder structures, database schemas, function signatures, data flows, and implementation rules.

Work through this document **in section order**. Each section corresponds to a build priority. Do not skip ahead. Do not improvise beyond what is specified here. If something is not covered in this document or the Product Brief, **stop and ask the product owner before building it.**

> **RULE 1** — Follow section order. Build Priority 1 fully before starting Priority 2.  
> **RULE 2** — Every function, route, and collection name in this document is the exact name to use in code.  
> **RULE 3** — If a decision is not covered here, ask before deciding.  
> **RULE 4** — After completing each priority, stop and demo to the product owner before continuing.  
> **RULE 5** — Write plain-English comments above every function explaining what it does.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Firestore Database Schema](#2-firestore-database-schema)
3. [Firebase Storage Structure](#3-firebase-storage-structure)
4. [Security Rules](#4-security-rules)
5. [Priority 1 — PDF Upload and Conversion Pipeline](#5-priority-1--pdf-upload-and-conversion-pipeline)
6. [Priority 2 — Flipbook Viewer](#6-priority-2--flipbook-viewer)
7. [Priority 3 — Authentication and Dashboard](#7-priority-3--authentication-and-dashboard)
8. [Priority 4 — Publishing Outputs](#8-priority-4--publishing-outputs)
9. [Priority 5A — Branding Controls and Analytics](#9-priority-5a--branding-controls-and-analytics)
10. [Priority 5B — Payment Integration](#10-priority-5b--payment-integration)
11. [Document Replacement](#11-document-replacement)
12. [Performance Rules](#12-performance-rules)
13. [Deployment Checklist](#13-deployment-checklist)

---

## 1. Project Setup

Complete all setup steps before writing any product code. This section establishes the foundation every other section depends on.

### 1.1 Firebase Project Creation

Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com) using the following settings exactly.

| Setting | Value |
|---|---|
| Project Name | docsflip |
| Project ID | docsflip-prod (override Firebase's suggestion) |
| Google Analytics | Enable — create a new Analytics account |
| Plan | Start on Spark — **upgrade to Blaze before building Priority 1** |

> **⚠ Important:** Cloud Functions require the Blaze (pay-as-you-go) plan. Upgrade before starting Priority 1.

After creating the project, enable these Firebase services in the console:

- **Authentication** — enable Email/Password provider only
- **Firestore Database** — production mode, region: `europe-west1`
- **Firebase Storage** — default bucket, same region as Firestore
- **Cloud Functions** — requires Blaze plan
- **Firebase Hosting** — enable and connect to the Next.js project

---

### 1.2 Folder Structure

Create the project with this exact folder structure. Do not deviate from these names.

```
docsflip/
├── app/                          # Next.js app directory
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   │   └── page.jsx
│   │   └── register/
│   │       └── page.jsx
│   ├── dashboard/                # Protected dashboard for logged-in users
│   │   └── page.jsx
│   ├── view/                     # Public flipbook viewer — no login required
│   │   └── [documentId]/
│   │       └── page.jsx
│   ├── layout.jsx
│   └── page.jsx                  # Landing / home page
├── components/
│   ├── FlipbookViewer.jsx        # StPageFlip viewer component
│   ├── UploadModal.jsx           # PDF upload dialog
│   ├── DocumentCard.jsx          # Single document card on dashboard
│   ├── AnalyticsDashboard.jsx    # Analytics charts component
│   ├── BrandingPanel.jsx         # Logo + color customization
│   ├── EmbedCodePanel.jsx        # Embed code display + copy button
│   └── PaymentModal.jsx          # Flutterwave payment trigger
├── lib/
│   ├── firebase.js               # Firebase app initialization
│   ├── firestore.js              # Firestore helper functions
│   ├── storage.js                # Firebase Storage helpers
│   ├── auth.js                   # Auth helper functions
│   ├── analytics.js              # Analytics event logging
│   └── flutterwave.js            # Flutterwave payment helpers
├── functions/                    # Firebase Cloud Functions
│   ├── index.js                  # Functions entry point — exports all functions
│   ├── convertPdf.js             # PDF-to-images conversion
│   ├── generateOfflineZip.js     # Offline HTML zip packager
│   ├── verifyAndActivate.js      # Payment verification + tier activation
│   ├── logAnalyticsEvent.js      # Server-side analytics helper
│   └── package.json
├── public/
│   └── logo.svg
├── .env.local                    # Environment variables — NEVER commit this file
├── firebase.json
├── firestore.rules
├── storage.rules
└── package.json
```

---

### 1.3 Environment Variables

Create `.env.local` in the project root. Get Firebase values from Firebase Console → Project Settings → Your Apps. Add `.env.local` to `.gitignore` immediately — never commit it.

```bash
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Flutterwave — get from Flutterwave Dashboard > API Keys
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=        # Server-side only — used in Cloud Functions, never in frontend

# App
NEXT_PUBLIC_APP_URL=https://docsflip.com   # Use http://localhost:3000 during development
```

> **⚠ Security:** Never use `NEXT_PUBLIC_` prefix for the Flutterwave secret key. It must only be used inside Firebase Cloud Functions.

---

### 1.4 Firebase Initialization

Create `lib/firebase.js` exactly as follows. Import Firebase services from this file everywhere — never initialize Firebase twice.

```javascript
// lib/firebase.js
// Initializes the Firebase app and exports all services.
// Import from this file everywhere — never initialize Firebase twice.

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Prevent re-initializing when Next.js hot-reloads in development
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
```

---

### 1.5 Dependencies

Run these install commands. Do not add packages not listed here without product owner approval.

```bash
# Frontend — run in project root
npm install firebase stpageflip react-dropzone recharts jszip flutterwave-react-v3

# Cloud Functions — run inside /functions directory
cd functions
npm install firebase-admin firebase-functions pdfjs-dist sharp jszip axios
```

---

## 2. Firestore Database Schema

Use these exact field names throughout the codebase. Do not add fields that are not listed here without approval.

### 2.1 Collection: `users`

One document per user. Document ID = Firebase Auth UID.

| Field | Type | Description | Example |
|---|---|---|---|
| uid | string | Firebase Auth UID — also the document ID | `abc123xyz` |
| email | string | User email address | `john@example.com` |
| displayName | string | Full name | `John Kamau` |
| orgName | string | Company or publication name | `The Nairobi Times` |
| logoUrl | string | Firebase Storage URL for uploaded logo | `https://storage...` |
| plan | string | `pay-per-doc` or `publishing-workspace` | `pay-per-doc` |
| currency | string | `KES` · `UGX` · `TZS` · `RWF` | `KES` |
| workspaceActive | boolean | True if Publishing Workspace plan is active | `false` |
| createdAt | timestamp | Account creation timestamp | Firestore Timestamp |

---

### 2.2 Collection: `documents`

One document per flipbook. Document ID = auto-generated by Firestore.

| Field | Type | Description | Example |
|---|---|---|---|
| documentId | string | Auto-generated Firestore ID | `Kd9xzP2mQr` |
| userId | string | Owner's Firebase Auth UID | `abc123xyz` |
| title | string | Document title set by user | `Annual Report 2024` |
| folderName | string | Optional folder for publishers | `Monthly Property Digest` |
| status | string | `uploading` · `converting` · `ready` · `error` | `ready` |
| pageCount | number | Total pages | `48` |
| pageUrls | array | Ordered array of Storage URLs for each page image | `['https://...']` |
| pdfUrl | string | Storage URL of original uploaded PDF | `https://storage...` |
| offlineZipUrl | string | Storage URL of offline zip — Premium only | `https://storage...` |
| tier | string | `starter` · `professional` · `premium` | `professional` |
| published | boolean | Whether the flipbook is publicly accessible | `true` |
| logoUrl | string | Branding logo URL | `https://storage...` |
| brandColor | string | Hex color for viewer background | `#1B4F8A` |
| showBranding | boolean | Show Docsflip branding — true for Starter only | `false` |
| views | number | Running total of viewer opens | `342` |
| createdAt | timestamp | Creation timestamp | Firestore Timestamp |
| updatedAt | timestamp | Last updated timestamp | Firestore Timestamp |

---

### 2.3 Collection: `analytics`

One document per reader event. Document ID = auto-generated. Write-only from viewer, read-only from dashboard.

| Field | Type | Description | Example |
|---|---|---|---|
| documentId | string | The flipbook being viewed | `Kd9xzP2mQr` |
| userId | string | Owner of the document | `abc123xyz` |
| eventType | string | `viewer_opened` · `page_turned` · `session_ended` · `download_clicked` | `viewer_opened` |
| pageNumber | number | Page number for `page_turned` events — null for others | `12` |
| country | string | Approximate reader country from IP | `Kenya` |
| sessionId | string | Random ID per reading session | `s_8xkP2m` |
| pagesReached | number | Highest page reached — set on `session_ended` | `31` |
| timestamp | timestamp | When the event occurred | Firestore Timestamp |

---

### 2.4 Collection: `payments`

One document per transaction. Created by Cloud Function after Flutterwave confirms payment.

| Field | Type | Description | Example |
|---|---|---|---|
| paymentId | string | Flutterwave transaction reference | `FLW-MOCK-abc123` |
| userId | string | Paying user's UID | `abc123xyz` |
| documentId | string | Document paid for — null for workspace plan | `Kd9xzP2mQr` |
| tier | string | `starter` · `professional` · `premium` · `workspace` | `professional` |
| amount | number | Amount paid | `800` |
| currency | string | Currency code | `KES` |
| status | string | `pending` · `completed` · `failed` | `completed` |
| method | string | `mpesa` · `card` · `invoice` | `mpesa` |
| createdAt | timestamp | Payment timestamp | Firestore Timestamp |

---

## 3. Firebase Storage Structure

Use these exact paths throughout the codebase.

```
uploads/
└── {userId}/
    └── {documentId}.pdf              # Original PDF — deleted after conversion

documents/
└── {userId}/
    └── {documentId}/
        ├── pages/
        │   ├── page_001.jpg          # Zero-padded 3-digit page numbers
        │   ├── page_002.jpg
        │   └── page_NNN.jpg
        └── offline/
            └── offline.zip           # Premium tier only

logos/
└── {userId}/
    └── logo.{ext}                    # Overwrites on re-upload
```

> **⚠ Naming rule:** Page images must use zero-padded 3-digit numbering: `page_001.jpg`, `page_002.jpg`. This ensures correct sort order when the viewer loads pages as an array.

---

## 4. Security Rules

### 4.1 Firestore Security Rules

Copy this exactly into `firestore.rules`.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Document owner has full access; public can read published documents
    match /documents/{documentId} {
      allow read: if resource.data.published == true ||
                     (request.auth != null && request.auth.uid == resource.data.userId);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
                                request.auth.uid == resource.data.userId;
    }

    // Analytics: anyone can write events; only document owner can read
    match /analytics/{eventId} {
      allow create: if true;  // End readers (unauthenticated) can log events
      allow read: if request.auth != null &&
                     request.auth.uid == resource.data.userId;
    }

    // Payments: owner read only; Cloud Functions write via Admin SDK
    match /payments/{paymentId} {
      allow read: if request.auth != null &&
                     request.auth.uid == resource.data.userId;
      allow write: if false;  // Only Cloud Functions write payments
    }
  }
}
```

---

### 4.2 Firebase Storage Security Rules

Copy this exactly into `storage.rules`.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Uploads: only authenticated user can upload to their own path
    match /uploads/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Page images: public read required for embedded flipbooks
    match /documents/{userId}/{documentId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Logos: public read, authenticated write
    match /logos/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 5. Priority 1 — PDF Upload and Conversion Pipeline

This is the first thing to build. Nothing else works without it.

**Pipeline flow:** Browser upload → Firebase Storage → Cloud Function trigger → Page image generation → Firestore status update → Viewer ready

---

### 5.1 Upload Flow — Frontend

The upload is initiated from `UploadModal.jsx`. The user selects a PDF, enters a title, and confirms. The frontend uploads to Firebase Storage and creates a Firestore document with status `uploading`. It then listens to that Firestore document in real time for status changes.

```javascript
// components/UploadModal.jsx — core upload logic
// Full UI wrapping this logic is left to the agent to implement cleanly

import { ref, uploadBytesResumable } from 'firebase/storage';
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '@/lib/firebase';

async function handleUpload(file, title) {
  const userId     = auth.currentUser.uid;
  const documentId = crypto.randomUUID();
  const storagePath = `uploads/${userId}/${documentId}.pdf`;

  // Step 1: Create Firestore document immediately with 'uploading' status
  await addDoc(collection(db, 'documents'), {
    documentId,
    userId,
    title,
    status:     'uploading',
    published:  false,
    pageUrls:   [],
    tier:       null,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp()
  });

  // Step 2: Upload PDF to Firebase Storage with progress tracking
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    customMetadata: { documentId, userId }  // Cloud Function reads these
  });

  uploadTask.on('state_changed',
    snapshot => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      // Update progress bar in UI with progress value
    },
    error => console.error('Upload failed:', error),
    () => {
      // Upload complete — Cloud Function triggers automatically
      // UI listens to Firestore for status updates via listenToDocument()
    }
  );
}

// Real-time Firestore listener — shows conversion progress without polling
function listenToDocument(documentId, onUpdate) {
  return onSnapshot(doc(db, 'documents', documentId), snapshot => {
    onUpdate(snapshot.data());
  });
}
```

> **⚠ Page limit:** Validate the PDF page count on the frontend before upload. If the document exceeds 100 pages, show an error and block the upload. Do not let oversized files reach Firebase Storage.

---

### 5.2 Cloud Function — `convertPdf`

Triggers automatically when a PDF is uploaded to `uploads/`. Converts each page to JPEG and saves to `documents/`. Runs server-side only.

```javascript
// functions/convertPdf.js
// Triggered by: Firebase Storage upload to uploads/{userId}/{documentId}.pdf
// Reads:  uploaded PDF from Storage
// Writes: JPEG page images back to Storage, updates Firestore document status

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const pdfjsLib  = require('pdfjs-dist/legacy/build/pdf.js');
const sharp     = require('sharp');
const path      = require('path');
const os        = require('os');
const fs        = require('fs');

exports.convertPdf = functions.storage
  .object()
  .onFinalize(async (object) => {

    // Only process files in the uploads/ path
    if (!object.name.startsWith('uploads/')) return null;

    const { documentId, userId } = object.metadata;
    const bucket  = admin.storage().bucket();
    const db      = admin.firestore();
    const docRef  = db.collection('documents').doc(documentId);

    try {
      // Step 1: Update Firestore status to 'converting'
      await docRef.update({ status: 'converting' });

      // Step 2: Download PDF to Cloud Function temp directory
      const tempPdfPath = path.join(os.tmpdir(), `${documentId}.pdf`);
      await bucket.file(object.name).download({ destination: tempPdfPath });

      // Step 3: Load PDF with PDF.js
      const pdfData   = new Uint8Array(fs.readFileSync(tempPdfPath));
      const pdfDoc    = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const pageCount = pdfDoc.numPages;
      const pageUrls  = [];

      // Step 4: Render each page to JPEG and upload to Storage
      for (let i = 1; i <= pageCount; i++) {
        const page     = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        // Render page to canvas buffer, then compress with sharp
        // (use canvas package for node-based rendering)
        const jpegBuffer = await sharp(canvasBuffer)
          .jpeg({ quality: 80 })   // 80% quality — good visual quality at half the file size
          .toBuffer();

        // Zero-padded filename — critical for correct page order
        const pageNum  = String(i).padStart(3, '0');
        const destPath = `documents/${userId}/${documentId}/pages/page_${pageNum}.jpg`;

        await bucket.file(destPath).save(jpegBuffer, {
          metadata: { contentType: 'image/jpeg',
                      cacheControl: 'public, max-age=31536000' }
        });

        await bucket.file(destPath).makePublic();
        const pageUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`;
        pageUrls.push(pageUrl);
      }

      // Step 5: Update Firestore — status 'ready', add page URLs
      await docRef.update({
        status:    'ready',
        pageCount,
        pageUrls,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Step 6: Delete the original PDF to save storage costs
      await bucket.file(object.name).delete();

      return null;

    } catch (error) {
      // Mark as error so the user sees feedback in the dashboard
      await docRef.update({ status: 'error' });
      console.error('convertPdf error:', error);
      return null;
    }
  });
```

---

## 6. Priority 2 — Flipbook Viewer

The viewer is the product. Everything the user pays for is experienced here. It must be fast, mobile-friendly, and frictionless.

### 6.1 Viewer Routes

| Route | Purpose | Who Accesses It |
|---|---|---|
| `/view/[documentId]` | Public viewer — shared URL and embed iframe source | Anyone — no login required |
| `/dashboard/preview/[documentId]` | Owner preview before publishing | Logged-in document owner only |

---

### 6.2 FlipbookViewer Component

```javascript
// components/FlipbookViewer.jsx
// Renders the interactive flipbook using StPageFlip.
// Used on both the public /view route and the dashboard preview.

'use client';
import { useEffect, useRef, useState } from 'react';
import { PageFlip } from 'stpageflip';

export default function FlipbookViewer({
  pageUrls,       // Array of image URLs in page order
  title,          // Document title
  logoUrl,        // Branding logo URL (null if none)
  brandColor,     // Hex background color e.g. '#1B4F8A'
  showBranding,   // Boolean — show 'Powered by Docsflip' if true (Starter tier)
  documentId,     // Used for analytics
  onPageTurn      // Callback on each page turn — used for analytics logging
}) {
  const containerRef = useRef(null);
  const pageFlipRef  = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    if (!containerRef.current || pageUrls.length === 0) return;

    const pf = new PageFlip(containerRef.current, {
      width:               550,
      height:              733,
      size:                'stretch',  // Fills its container
      minWidth:            300,
      maxWidth:            1000,
      minHeight:           400,
      maxHeight:           1350,
      usePortrait:         true,       // Single page on mobile — required
      showCover:           false,
      mobileScrollSupport: true
    });

    pf.loadFromImages(pageUrls);

    pf.on('flip', e => {
      setCurrentPage(e.data);
      if (onPageTurn) onPageTurn(e.data);
    });

    pf.on('load', () => setIsLoading(false));

    pageFlipRef.current = pf;

    return () => pf.destroy();
  }, [pageUrls]);

  return (
    <div style={{ background: brandColor || '#1B4F8A', minHeight: '100vh' }}>

      {/* Viewer header with logo and title */}
      <div className="viewer-header">
        {logoUrl && <img src={logoUrl} alt="logo" className="brand-logo" />}
        <span className="viewer-title">{title}</span>
        {showBranding && <span className="powered-by">Powered by Docsflip</span>}
      </div>

      {/* Loading skeleton — shown while images initialize */}
      {isLoading && <div className="loading-skeleton">Loading your document...</div>}

      {/* StPageFlip mount point */}
      <div ref={containerRef} className="flipbook-container" />

      {/* Navigation controls */}
      <div className="viewer-controls">
        <button onClick={() => pageFlipRef.current?.flipPrev()}>← Previous</button>
        <span>{currentPage + 1} / {pageUrls.length}</span>
        <button onClick={() => pageFlipRef.current?.flipNext()}>Next →</button>
        <button onClick={() => containerRef.current?.requestFullscreen()}>⛶ Fullscreen</button>
      </div>

    </div>
  );
}
```

---

### 6.3 Public Viewer Page

```javascript
// app/view/[documentId]/page.jsx
// Public page — no authentication required.
// Loads document from Firestore and renders FlipbookViewer.

'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import FlipbookViewer from '@/components/FlipbookViewer';
import { logViewerEvent } from '@/lib/analytics';

export default function ViewPage({ params }) {
  const [document, setDocument] = useState(null);
  const [error,    setError]    = useState(null);
  const sessionId = crypto.randomUUID();  // Unique ID for this reading session

  useEffect(() => {
    async function loadDocument() {
      const docSnap = await getDoc(doc(db, 'documents', params.documentId));

      if (!docSnap.exists() || !docSnap.data().published) {
        setError('Document not found or not published.');
        return;
      }

      setDocument(docSnap.data());

      // Log viewer_opened analytics event
      await logViewerEvent({
        documentId: params.documentId,
        userId:     docSnap.data().userId,
        eventType:  'viewer_opened',
        sessionId
      });
    }

    loadDocument();

    // Log session_ended when user navigates away
    return () => {
      logViewerEvent({
        documentId: params.documentId,
        eventType:  'session_ended',
        sessionId
      });
    };
  }, []);

  if (error)    return <div className="viewer-error">{error}</div>;
  if (!document) return <div className="viewer-loading">Loading...</div>;

  return (
    <FlipbookViewer
      pageUrls={document.pageUrls}
      title={document.title}
      logoUrl={document.logoUrl}
      brandColor={document.brandColor}
      showBranding={document.showBranding}
      documentId={params.documentId}
      onPageTurn={(page) => logViewerEvent({
        documentId: params.documentId,
        eventType:  'page_turned',
        pageNumber: page,
        sessionId
      })}
    />
  );
}
```

---

## 7. Priority 3 — Authentication and Dashboard

### 7.1 Authentication

Use Firebase Authentication with **email and password only**. Do not add Google, Facebook, or other social login providers in the MVP.

```javascript
// lib/auth.js
// All authentication functions — import from here everywhere.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Register — creates Auth account AND Firestore user document
export async function registerUser(email, password, displayName, orgName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user       = credential.user;

  // Create the Firestore user document immediately after auth creation
  await setDoc(doc(db, 'users', user.uid), {
    uid:             user.uid,
    email,
    displayName,
    orgName,
    logoUrl:         null,
    plan:            'pay-per-doc',
    currency:        'KES',
    workspaceActive: false,
    createdAt:       serverTimestamp()
  });

  return user;
}

export const loginUser  = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutUser = () => signOut(auth);
```

---

### 7.2 Dashboard Layout

The dashboard is the main workspace for logged-in users. Keep it clean and fast.

**The dashboard must display:**
- User name and org name in the top navigation bar
- "Upload New Document" button — prominently placed, always visible
- All user documents as cards — sorted by most recent first
- Each card shows: document title, status badge, tier badge, view count, created date
- Clicking a card opens document options: Preview · Share · Analytics · Replace · Delete

**For Publishing Workspace users, additionally show:**
- Folder list in left sidebar (publication titles)
- Button to create a new folder
- Filter to view documents by selected folder

---

### 7.3 Document Status Display

Map Firestore `status` values to UI states as follows:

| Firestore Status | UI Label | Colour | User Action |
|---|---|---|---|
| `uploading` | Uploading... | Grey | None — show progress bar |
| `converting` | Converting... | Blue | None — show spinner |
| `ready` | Ready | Green | Preview, Share, Analytics, Replace, Delete |
| `error` | Failed | Red | Delete and try again |

---

## 8. Priority 4 — Publishing Outputs

Publishing outputs are only unlocked after payment is confirmed. Build in this order: **(a) shareable URL → (b) embed code → (c) offline HTML download.**

### 8.1 Shareable URL — All Tiers

The shareable URL is automatically available for every document that has been paid for at any tier. No additional generation required.

```javascript
// URL format — this is the link given to the user after payment
// https://docsflip.com/view/{documentId}

// Derived client-side
const shareableUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${documentId}`;
```

After Starter tier payment, set `published: true` and `tier: 'starter'` on the Firestore document. The URL is immediately live.

---

### 8.2 Embed Code — Professional and Premium Tiers

```javascript
// components/EmbedCodePanel.jsx
// Generates the iframe embed code and provides a one-click copy button.

export default function EmbedCodePanel({ documentId }) {
  const embedCode =
`<iframe
  src="https://docsflip.com/view/${documentId}"
  width="100%"
  height="600px"
  frameborder="0"
  allowfullscreen>
</iframe>`;

  return (
    <div>
      <pre>{embedCode}</pre>
      <button onClick={() => navigator.clipboard.writeText(embedCode)}>
        Copy Embed Code
      </button>
    </div>
  );
}
```

> **⚠ Branding:** For Professional and Premium tiers, set `showBranding: false` on the Firestore document after payment. The viewer reads this field and hides the "Powered by Docsflip" label.

---

### 8.3 Offline HTML Download — Premium Tier Only

The offline package is a zip file containing the full flipbook viewer plus all page images. Generated by a Cloud Function after Premium payment is confirmed.

```javascript
// functions/generateOfflineZip.js
// Called as an HTTPS Cloud Function after Premium payment confirmed.
// Packages StPageFlip viewer + all page images into a downloadable zip.

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const JSZip     = require('jszip');
const axios     = require('axios');
const fs        = require('fs');

exports.generateOfflineZip = functions.https.onCall(async (data, context) => {

  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  const { documentId } = data;
  const db     = admin.firestore();
  const bucket = admin.storage().bucket();

  const docSnap = await db.collection('documents').doc(documentId).get();
  const docData = docSnap.data();

  // Verify ownership and tier
  if (docData.userId !== context.auth.uid)
    throw new functions.https.HttpsError('permission-denied', 'Not your document');
  if (docData.tier !== 'premium')
    throw new functions.https.HttpsError('failed-precondition', 'Premium tier required');

  const zip         = new JSZip();
  const pagesFolder = zip.folder('pages');

  // Add each page image to the zip
  for (const [index, url] of docData.pageUrls.entries()) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const pageNum  = String(index + 1).padStart(3, '0');
    pagesFolder.file(`page_${pageNum}.jpg`, response.data);
  }

  // Add the StPageFlip library
  const stpageflipJs = fs.readFileSync('./stpageflip.min.js');
  zip.file('stpageflip.min.js', stpageflipJs);

  // Generate index.html — the standalone viewer
  const pageImgTags = docData.pageUrls.map((_, i) => {
    const num = String(i + 1).padStart(3, '0');
    return `    <img src="pages/page_${num}.jpg" />`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${docData.title}</title>
  <script src="stpageflip.min.js"></script>
  <style>body { margin: 0; background: ${docData.brandColor || '#1B4F8A'}; }</style>
</head>
<body>
  <div id="flipbook">
${pageImgTags}
  </div>
  <script>
    const pf = new St.PageFlip(document.getElementById('flipbook'), {
      width: 550, height: 733, size: 'stretch', usePortrait: true
    });
    pf.loadFromImages(document.querySelectorAll('#flipbook img'));
  </script>
</body>
</html>`;

  zip.file('index.html', html);

  // Save zip to Firebase Storage
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  const zipPath   = `documents/${docData.userId}/${documentId}/offline/offline.zip`;

  await bucket.file(zipPath).save(zipBuffer, {
    metadata: { contentType: 'application/zip' }
  });
  await bucket.file(zipPath).makePublic();

  const zipUrl = `https://storage.googleapis.com/${bucket.name}/${zipPath}`;
  await db.collection('documents').doc(documentId).update({ offlineZipUrl: zipUrl });

  return { zipUrl };
});
```

---

## 9. Priority 5A — Branding Controls and Analytics

### 9.1 Branding Controls

Branding settings are stored on the Firestore document. The `BrandingPanel` component lets the user update these from the dashboard.

```javascript
// Branding fields updated via BrandingPanel.jsx
// Written to Firestore, read by FlipbookViewer

const brandingUpdate = {
  logoUrl:      'https://storage...',  // Uploaded logo URL
  brandColor:   '#1B4F8A',             // Hex color for viewer background
  showBranding: false                  // false = Docsflip branding hidden
};

// Update in Firestore
await updateDoc(doc(db, 'documents', documentId), brandingUpdate);
```

> **Logo uploads:** Save to `logos/{userId}/logo.{ext}`. Overwrite the previous file at the same path on re-upload. Update `logoUrl` on the user document. Offer to apply the new logo to all existing documents or only new ones.

---

### 9.2 Analytics Events Logging

```javascript
// lib/analytics.js
// Logs analytics events to Firestore.
// Analytics failures must NEVER break the reading experience — always fail silently.

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function logViewerEvent({
  documentId, userId, eventType, pageNumber, sessionId, pagesReached
}) {
  try {
    await addDoc(collection(db, 'analytics'), {
      documentId,
      userId:       userId || null,
      eventType,
      pageNumber:   pageNumber   || null,
      pagesReached: pagesReached || null,
      sessionId,
      country:      await getApproxCountry(),
      timestamp:    serverTimestamp()
    });
  } catch (e) {
    console.warn('Analytics log failed silently:', e);
    // Do not rethrow — analytics must never break the viewer
  }
}

// Lightweight country detection via free IP geolocation
async function getApproxCountry() {
  try {
    const res  = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    return data.country_name || 'Unknown';
  } catch {
    return 'Unknown';
  }
}
```

---

### 9.3 Analytics Dashboard — Four Metrics

Build the `AnalyticsDashboard` component using **Recharts** (already in dependencies). Display these four metrics only.

| Metric | Query Logic |
|---|---|
| Total Views | COUNT of `analytics` docs where `eventType = 'viewer_opened'` AND `documentId = current` |
| Views Over Time | GROUP `viewer_opened` events by date → Recharts LineChart |
| Top Countries | GROUP BY `country` from `viewer_opened` events → top 5 as a list |
| Avg Pages Read | AVERAGE of `pagesReached` from `session_ended` events |

---

## 10. Priority 5B — Payment Integration

### 10.1 Pricing Configuration

Define all pricing in one file. Change prices here only — never hardcode amounts elsewhere.

```javascript
// lib/pricing.js
// Single source of truth for all pricing.

export const PRICING = {
  KES: {
    starter:      { amount: 400,    label: 'KSh 400' },
    professional: { amount: 800,    label: 'KSh 800' },
    premium:      { amount: 2500,   label: 'KSh 2,500' },
    workspace:    { amount: 12500,  label: 'KSh 12,500 / month' }
  },
  UGX: {
    starter:      { amount: 57000,   label: 'UGX 57,000' },
    professional: { amount: 114000,  label: 'UGX 114,000' },
    premium:      { amount: 356000,  label: 'UGX 356,000' },
    workspace:    { amount: 1780000, label: 'UGX 1,780,000 / month' }
  },
  TZS: {
    starter:      { amount: 10500,  label: 'TZS 10,500' },
    professional: { amount: 21000,  label: 'TZS 21,000' },
    premium:      { amount: 65500,  label: 'TZS 65,500' },
    workspace:    { amount: 328000, label: 'TZS 328,000 / month' }
  }
  // Add RWF using the same structure when needed
};
```

---

### 10.2 Flutterwave Payment Trigger

```javascript
// components/PaymentModal.jsx
// Opens the Flutterwave payment modal.
// On success, calls the verifyAndActivate Cloud Function.

import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { PRICING } from '@/lib/pricing';

export default function PaymentModal({ user, document, tier, onSuccess }) {
  const price     = PRICING[user.currency]?.[tier] || PRICING['KES'][tier];
  const functions = getFunctions();

  const config = {
    public_key:      process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
    tx_ref:          `DOC-${document.documentId}-${Date.now()}`,
    amount:          price.amount,
    currency:        user.currency,
    payment_options: 'mpesa,card,banktransfer',
    customer: {
      email: user.email,
      name:  user.displayName
    },
    customizations: {
      title:       'Docsflip',
      description: `${tier} — ${document.title}`,
      logo:        'https://docsflip.com/logo.svg'
    }
  };

  const handleFlutterPayment = useFlutterwave(config);

  function triggerPayment() {
    handleFlutterPayment({
      callback: async (response) => {
        closePaymentModal();
        if (response.status === 'successful') {
          const verifyAndActivate = httpsCallable(functions, 'verifyAndActivate');
          await verifyAndActivate({
            transactionId: response.transaction_id,
            documentId:    document.documentId,
            tier
          });
          onSuccess();
        }
      },
      onClose: () => {}
    });
  }

  return (
    <div>
      <p>You are purchasing: <strong>{tier}</strong></p>
      <p>Amount: <strong>{price.label}</strong></p>
      <button onClick={triggerPayment}>Pay Now</button>
    </div>
  );
}
```

---

### 10.3 Payment Verification Cloud Function

**Always verify server-side.** Never trust the client's report of a successful payment.

```javascript
// functions/verifyAndActivate.js
// Verifies Flutterwave transaction and activates the document tier.
// Called after successful Flutterwave payment on the frontend.

exports.verifyAndActivate = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated');

  const { transactionId, documentId, tier } = data;
  const userId = context.auth.uid;

  // Step 1: Verify transaction with Flutterwave API
  const response = await axios.get(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    { headers: { Authorization: `Bearer ${functions.config().flutterwave.secret}` } }
  );

  const txData = response.data.data;

  // Step 2: Confirm payment is successful and amount matches expected
  const expectedAmount = PRICING[txData.currency]?.[tier]?.amount;
  if (txData.status !== 'successful' || txData.amount < expectedAmount) {
    throw new functions.https.HttpsError('failed-precondition', 'Payment verification failed');
  }

  const db = admin.firestore();

  // Step 3: Activate the tier on the Firestore document
  await db.collection('documents').doc(documentId).update({
    tier,
    published:    true,
    showBranding: tier === 'starter',  // Only Starter shows Docsflip branding
    updatedAt:    admin.firestore.FieldValue.serverTimestamp()
  });

  // Step 4: Record the payment
  await db.collection('payments').add({
    paymentId:  String(transactionId),
    userId,
    documentId,
    tier,
    amount:     txData.amount,
    currency:   txData.currency,
    status:     'completed',
    method:     txData.payment_type,
    createdAt:  admin.firestore.FieldValue.serverTimestamp()
  });

  // Step 5: If Premium, generate the offline zip
  if (tier === 'premium') {
    // Trigger generateOfflineZip inline here
  }

  return { success: true };
});
```

> **Set the Flutterwave secret in Firebase Functions config:**
> ```bash
> firebase functions:config:set flutterwave.secret="YOUR_SECRET_KEY"
> ```

---

## 11. Document Replacement

Users must be able to upload a new version without breaking the existing shareable URL or embed code. The URL and embed always use the `documentId` — so as long as the `documentId` stays the same, all existing links continue to work.

**Replacement flow:**

1. User clicks "Replace Document" on a document card in the dashboard
2. User selects a new PDF file
3. Upload the new PDF to the same path: `uploads/{userId}/{documentId}.pdf` — this overwrites the previous file
4. Reset the Firestore document `status` back to `'converting'`
5. Clear the existing `pageUrls` array in Firestore
6. The Cloud Function triggers again automatically on the new upload — it overwrites page images at the same Storage paths
7. When conversion completes, Firestore is updated with new `pageUrls`
8. The existing shareable URL and embed code now show the new version automatically

> **⚠ IMPORTANT:** Do NOT generate a new `documentId` on replacement. The `documentId` is the permanent identifier for the link and embed — it must never change.

---

## 12. Performance Rules

These are mandatory — not optional. East African readers on mobile data connections depend on them.

> **RULE 1 — Image compression:** All page JPEGs must be compressed at 80% quality using `sharp` in the Cloud Function. Do not serve uncompressed images.

> **RULE 2 — Lazy loading:** Only the current page and 2 adjacent pages should be loaded at any time. Override StPageFlip's default behavior of loading all images.

> **RULE 3 — Loading skeleton:** The viewer must show a visible loading state immediately on open. A blank white screen while images load is not acceptable.

> **RULE 4 — Browser caching:** Set `Cache-Control: public, max-age=31536000` on page images in Firebase Storage. Page images never change once created — they can be cached for a full year.

> **RULE 5 — Portrait mode on mobile:** `usePortrait: true` must always be set in the StPageFlip config. This shows a single page on small screens instead of a two-page spread.

> **RULE 6 — Non-blocking analytics:** Analytics events must be fire-and-forget. A failed analytics call must never delay or break the viewer load. Always wrap analytics calls in try/catch and fail silently.

---

## 13. Deployment Checklist

Complete every item before sharing the platform with any real user.

| # | Check | How to Verify |
|---|---|---|
| 1 | Firebase Blaze plan active | Console → Billing — must show Blaze plan |
| 2 | All env variables set in production | Firebase Hosting environment config set |
| 3 | Firestore security rules deployed | `firebase deploy --only firestore:rules` |
| 4 | Storage security rules deployed | `firebase deploy --only storage` |
| 5 | Cloud Functions deployed | `firebase deploy --only functions` |
| 6 | Flutterwave secret set in Functions config | `firebase functions:config:set flutterwave.secret=YOUR_KEY` |
| 7 | PDF upload and conversion tested end-to-end | Upload a real PDF, confirm page images appear in Storage |
| 8 | Viewer tested on mobile (Android + iPhone) | Open shareable URL on real devices — check flip animation |
| 9 | Embed tested on an external website | Paste embed code into a test HTML page, confirm it loads |
| 10 | Payment tested with Flutterwave test mode | Use Flutterwave test card numbers, verify Firestore is updated |
| 11 | Document replacement tested | Replace a document, confirm old URL shows new content |
| 12 | Analytics events appearing in Firestore | Open a document, check `/analytics` collection in Firestore Console |
| 13 | Error states handled gracefully | Simulate a conversion failure, confirm user sees a clear error |
| 14 | `.env.local` excluded from git | Check `.gitignore` before first commit |

---

*End of Technical Implementation Guide — Docsflip v1.0*  
*Read this document alongside the MVP Product Brief v2.0. Both documents together define the complete build.*
