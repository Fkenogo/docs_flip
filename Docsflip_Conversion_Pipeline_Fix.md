# DOCSFLIP — Conversion Pipeline Fix Guide
### Priority 1 Unblock: PDF Rendering in Cloud Run

**Prepared:** 2026-02-24  
**Status:** Priority 1 is blocked. This document tells you exactly why, and exactly how to fix it.  
**Audience:** AI Coding Agent  
**Read this document completely before changing any code.**

---

## Part 1 — What Is Actually Wrong (The Real Root Cause)

The agent has been attempting different combinations of PDF.js, canvas, and sharp to render PDFs inside Firebase Cloud Functions. This is the error loop. No combination of those packages will ever work in this environment, and here is exactly why.

### The Loop the Agent Is Stuck In

**Attempt 1 — PDF.js + canvas package:**  
Failed with `TypeError: Image or Canvas expected` deep inside PDF.js internals. The `canvas` npm package ships a native binary compiled for a specific OS and architecture. The binary that installs on a Mac or in CI is not compatible with the Firebase Cloud Functions Gen1 Linux runtime. PDF.js uses canvas as its rendering surface, so when canvas fails, PDF.js fails at the first image it tries to paint.

**Attempt 2 — sharp reading PDFs directly:**  
The current `convertPdf.js` uses `sharp(tempPdfPath, { density: 150, page: 0 })` on a PDF file. This looks reasonable because sharp can read many file formats. However, sharp's ability to read PDFs is not built into sharp itself — it depends on the underlying `libvips` C library being compiled with `poppler` support. The `sharp` npm package ships a pre-compiled `libvips` binary. That binary is compiled **without** poppler. Firebase's managed runtime also does not have poppler installed as a system library. So sharp cannot read PDFs in this environment either, regardless of options or version.

### The Root Cause in One Sentence

**Firebase Cloud Functions managed runtime — both Gen1 and standard Gen2 — does not ship any system-level PDF rendering library, and no npm package can compensate for a missing system binary.**

Changing package versions, configuration flags, or pdf.js options will not solve this. The system library simply is not there.

---

## Part 2 — The Fix

The fix is to stop trying to render PDFs inside Firebase Cloud Functions and move the rendering step to **Google Cloud Run**, where you control the container and can install whatever system libraries you need.

This is not a major architectural change. It is a focused addition of one new service. Everything else in the stack — Firebase Auth, Firestore, Firebase Storage, Firebase Hosting, all other Cloud Functions — stays exactly as it is.

### How the Fixed Architecture Works

```
User uploads PDF
       ↓
Firebase Storage (uploads/{userId}/{documentId}.pdf)
       ↓
Firebase Cloud Function: convertPdf (TRIGGER ONLY — no rendering)
  - Updates Firestore status to 'converting'
  - Calls Cloud Run service via HTTP POST with { bucket, filePath, documentId, userId }
       ↓
Cloud Run Service (custom Docker container with poppler-utils installed)
  - Downloads PDF from Firebase Storage
  - Runs pdftoppm to convert each page to JPEG
  - Uploads page images back to Firebase Storage
  - Updates Firestore document to status: 'ready' with pageUrls array
       ↓
Frontend Firestore listener detects status: 'ready'
  - Shows completed flipbook preview to user
```

### Why This Works

Cloud Run lets you use a custom Docker container. The container installs `poppler-utils` — a battle-tested, widely-used Linux library for PDF rendering. The `pdftoppm` command inside poppler converts PDF pages to JPEG images reliably, handling embedded images, transparency groups, and non-standard fonts correctly. This is the same approach used by production PDF services globally.

### Why This Is the Right Call and Not Over-Engineering

The audit report already identified Cloud Run as the primary recommendation. Every major PDF-handling service uses a server-side rendering approach with system libraries — not Node.js packages — for this step. Firebase Cloud Functions was never designed for binary format conversion. Using Cloud Run for exactly this purpose is correct and appropriate. The rest of the stack does not change.

---

## Part 3 — Exact Implementation Steps

Follow these steps in exact order. Do not skip steps. Confirm each step works before moving to the next.

---

### Step 1 — Create the Cloud Run Service Directory

Inside the project root (alongside the `functions/` and `app/` directories), create a new directory:

```
docsflip/
├── app/
├── functions/
├── converter/          ← CREATE THIS
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
```

---

### Step 2 — Create the Dockerfile

Create `converter/Dockerfile` with exactly the following content:

```dockerfile
# Use the official Node.js 20 image on Debian Bookworm (slim)
FROM node:20-bookworm-slim

# Install poppler-utils — this gives us pdftoppm for PDF-to-image conversion
# Also install curl for health checks
RUN apt-get update && apt-get install -y \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install Node dependencies
COPY package.json ./
RUN npm install --production

# Copy application code
COPY server.js ./

# Cloud Run expects the service to listen on PORT env variable
ENV PORT=8080
EXPOSE 8080

# Start the conversion server
CMD ["node", "server.js"]
```

---

### Step 3 — Create the Conversion Server

Create `converter/package.json`:

```json
{
  "name": "docsflip-converter",
  "version": "1.0.0",
  "description": "PDF to JPEG conversion service for Docsflip",
  "main": "server.js",
  "type": "commonjs",
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "@google-cloud/firestore": "^7.0.0",
    "@google-cloud/storage": "^7.0.0",
    "express": "^4.18.2"
  }
}
```

Create `converter/server.js` with the following content:

```javascript
// converter/server.js
// Cloud Run service that converts PDF pages to JPEG images using pdftoppm.
// Receives conversion requests from the Firebase Cloud Function orchestrator.
// Writes page images to Firebase Storage and updates Firestore on completion.

'use strict';

const express  = require('express');
const { exec } = require('child_process');
const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const { Storage }   = require('@google-cloud/storage');
const { Firestore } = require('@google-cloud/firestore');

const app      = express();
const storage  = new Storage();
const firestore = new Firestore();

app.use(express.json());

// Health check endpoint — Cloud Run uses this to verify the service is running
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Main conversion endpoint — called by the Firebase Cloud Function
app.post('/convert', async (req, res) => {
  const { bucketName, filePath, documentId, userId } = req.body;

  // Validate all required fields are present
  if (!bucketName || !filePath || !documentId || !userId) {
    console.error('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields: bucketName, filePath, documentId, userId' });
  }

  console.log(`Starting conversion: documentId=${documentId}, file=${filePath}`);

  const tempDir     = fs.mkdtempSync(path.join(os.tmpdir(), 'docsflip-'));
  const tempPdfPath = path.join(tempDir, 'input.pdf');
  const outputPrefix = path.join(tempDir, 'page');

  try {
    // Step 1: Download the PDF from Firebase Storage to the temp directory
    console.log(`Downloading PDF from gs://${bucketName}/${filePath}`);
    const bucket = storage.bucket(bucketName);
    await bucket.file(filePath).download({ destination: tempPdfPath });
    console.log('PDF downloaded successfully');

    // Step 2: Convert all PDF pages to JPEG using pdftoppm (from poppler-utils)
    // -jpeg        → output format is JPEG
    // -r 150       → 150 DPI resolution — good quality for web display
    // -jpegopt quality=80 → 80% JPEG quality — matches our spec
    // outputPrefix → files will be named page-000001.jpg, page-000002.jpg, etc.
    await new Promise((resolve, reject) => {
      const cmd = `pdftoppm -jpeg -r 150 -jpegopt quality=80 "${tempPdfPath}" "${outputPrefix}"`;
      console.log(`Running: ${cmd}`);
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('pdftoppm error:', error.message);
          console.error('stderr:', stderr);
          reject(new Error(`pdftoppm failed: ${error.message}`));
        } else {
          console.log('pdftoppm completed successfully');
          resolve();
        }
      });
    });

    // Step 3: Find all generated JPEG files and sort them by page number
    const allFiles  = fs.readdirSync(tempDir);
    const pageFiles = allFiles
      .filter(f => f.startsWith('page') && f.endsWith('.jpg'))
      .sort();  // Alphabetical sort gives correct page order for pdftoppm output

    const pageCount = pageFiles.length;
    console.log(`Converted ${pageCount} pages`);

    if (pageCount === 0) {
      throw new Error('pdftoppm produced no output files — PDF may be corrupted or empty');
    }

    // Step 4: Upload each page image to Firebase Storage
    const pageUrls = [];

    for (let i = 0; i < pageFiles.length; i++) {
      const pageNumber = i + 1;
      // Zero-pad to 3 digits: 001, 002, 003 — matches our storage path spec
      const paddedNum  = String(pageNumber).padStart(3, '0');
      const destPath   = `documents/${userId}/${documentId}/pages/page_${paddedNum}.jpg`;
      const localPath  = path.join(tempDir, pageFiles[i]);

      console.log(`Uploading page ${pageNumber}/${pageCount} to ${destPath}`);

      await bucket.upload(localPath, {
        destination: destPath,
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        },
      });

      // Make the image publicly readable (required for the embed viewer)
      await bucket.file(destPath).makePublic();

      const pageUrl = `https://storage.googleapis.com/${bucketName}/${destPath}`;
      pageUrls.push(pageUrl);
    }

    console.log(`All ${pageCount} pages uploaded to Storage`);

    // Step 5: Update Firestore document to 'ready' with all page URLs
    await firestore.collection('documents').doc(documentId).update({
      status:    'ready',
      pageCount,
      pageUrls,
      updatedAt: Firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Firestore updated to ready for documentId=${documentId}`);

    // Step 6: Delete the original PDF upload to save storage costs
    try {
      await bucket.file(filePath).delete();
      console.log('Original PDF deleted from uploads/');
    } catch (deleteError) {
      // Non-fatal — log but do not fail the conversion
      console.warn('Could not delete original PDF:', deleteError.message);
    }

    // Step 7: Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`Conversion complete: documentId=${documentId}`);
    return res.status(200).json({ success: true, pageCount, documentId });

  } catch (error) {
    console.error(`Conversion failed for documentId=${documentId}:`, error.message);

    // Update Firestore to error state so the user sees feedback
    try {
      await firestore.collection('documents').doc(documentId).update({
        status:    'error',
        updatedAt: Firestore.FieldValue.serverTimestamp(),
      });
    } catch (firestoreError) {
      console.error('Also failed to update Firestore error state:', firestoreError.message);
    }

    // Clean up temp directory even on failure
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}

    return res.status(500).json({ error: error.message, documentId });
  }
});

// Start the server — Cloud Run injects PORT environment variable
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Docsflip converter service listening on port ${PORT}`);
});
```

---

### Step 4 — Rewrite the Firebase Cloud Function

Replace the entire contents of `functions/convertPdf.js` with the following. The function is now a lightweight orchestrator — it triggers on upload, updates status, calls Cloud Run, and returns. All rendering happens in Cloud Run.

```javascript
// functions/convertPdf.js
// Triggered when a PDF is uploaded to Firebase Storage under uploads/.
// This function is an ORCHESTRATOR ONLY — it does not render PDFs itself.
// It calls the Cloud Run converter service and delegates all rendering there.

const functions = require('firebase-functions/v1');
const admin     = require('firebase-admin');
const axios     = require('axios');

// Cloud Run service URL — set this after deploying the converter service
// Replace the placeholder below with the actual Cloud Run URL after Step 6
const CONVERTER_URL = process.env.CONVERTER_URL || 'https://docsflip-converter-REPLACE-THIS.run.app';

exports.convertPdf = functions
  .runWith({
    timeoutSeconds: 540,   // 9 minutes — give Cloud Run time to convert large documents
    memory: '512MB',
  })
  .storage.object()
  .onFinalize(async (object) => {

    // Only process files uploaded to the uploads/ path
    if (!object.name || !object.name.startsWith('uploads/')) return null;

    const { documentId, userId } = object.metadata || {};
    if (!documentId || !userId) {
      console.error('Missing metadata: documentId or userId not found on uploaded object');
      return null;
    }

    const db     = admin.firestore();
    const docRef = db.collection('documents').doc(documentId);

    try {
      // Update Firestore status to 'converting' so the frontend shows progress
      await docRef.update({
        status:    'converting',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Calling converter service for documentId=${documentId}`);

      // Call the Cloud Run converter service
      // Cloud Run handles the actual PDF-to-JPEG rendering using pdftoppm
      const response = await axios.post(
        `${CONVERTER_URL}/convert`,
        {
          bucketName:  object.bucket,
          filePath:    object.name,
          documentId,
          userId,
        },
        {
          timeout: 520000,  // 520 seconds — slightly less than function timeout
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log(`Converter service responded: ${JSON.stringify(response.data)}`);
      // Cloud Run service handles Firestore update to 'ready' directly
      return null;

    } catch (error) {
      // If Cloud Run call fails, mark document as error so user sees feedback
      console.error(`convertPdf orchestrator error for documentId=${documentId}:`, error.message);

      await docRef.update({
        status:    'error',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    }
  });
```

---

### Step 5 — Update `functions/package.json`

Remove `pdfjs-dist` and `canvas` — they are no longer needed. Keep `axios` for the Cloud Run HTTP call. Keep `sharp` for use in the offline zip generator if needed, but it is no longer used for PDF conversion.

Replace `functions/package.json` with:

```json
{
  "name": "functions",
  "version": "1.0.0",
  "description": "Firebase Cloud Functions for Docsflip",
  "main": "index.js",
  "type": "commonjs",
  "engines": {
    "node": "20"
  },
  "scripts": {
    "test": "echo \"No tests configured\" && exit 0"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.0.0",
    "jszip": "^3.10.1",
    "sharp": "^0.33.0"
  }
}
```

After saving this file, run inside the `functions/` directory:

```bash
cd functions
rm -rf node_modules
npm install
```

---

### Step 6 — Deploy the Cloud Run Service

This is done once from the terminal. You need the Google Cloud CLI (`gcloud`) installed and authenticated to the same GCP project as Firebase.

**6a. Confirm which GCP project you are using:**

```bash
gcloud config get-value project
```

If it does not show `docs-flip`, set it:

```bash
gcloud config set project docs-flip
```

**6b. Enable required Google Cloud APIs (only needed once):**

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

**6c. Deploy the Cloud Run service:**

Run this from the project root (not from inside `converter/`):

```bash
gcloud run deploy docsflip-converter \
  --source ./converter \
  --region europe-west1 \
  --platform managed \
  --no-allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=docs-flip"
```

> **Why `--no-allow-unauthenticated`:** The converter service should only be callable from your Firebase Cloud Function, not from the public internet. This flag enforces that.

**6d. Copy the Cloud Run service URL from the deploy output.**

After deployment completes, the terminal will show a line like:

```
Service URL: https://docsflip-converter-abc123-ew.a.run.app
```

Copy this URL. You will need it in Step 7.

---

### Step 7 — Give the Cloud Function Permission to Call Cloud Run

Because the Cloud Run service has `--no-allow-unauthenticated`, the Firebase Cloud Function needs an identity with permission to call it.

**7a. Find the service account used by your Cloud Functions:**

In the Firebase Console → Project Settings → Service Accounts, note the App Engine default service account email. It looks like:

```
docs-flip@appspot.gserviceaccount.com
```

**7b. Grant it permission to invoke the Cloud Run service:**

```bash
gcloud run services add-iam-policy-binding docsflip-converter \
  --region europe-west1 \
  --member="serviceAccount:docs-flip@appspot.gserviceaccount.com" \
  --role="roles/run.invoker"
```

**7c. Set the CONVERTER_URL environment variable in Firebase Functions config:**

```bash
firebase functions:config:set converter.url="https://docsflip-converter-PASTE-YOUR-URL-HERE.run.app"
```

Then update `functions/convertPdf.js` to read this config value. Replace the `CONVERTER_URL` constant at the top of `convertPdf.js` with:

```javascript
// Read Cloud Run URL from Firebase Functions config
const CONVERTER_URL = (functions.config().converter && functions.config().converter.url)
  || process.env.CONVERTER_URL
  || '';

if (!CONVERTER_URL) {
  console.error('CONVERTER_URL is not set. Run: firebase functions:config:set converter.url="YOUR_CLOUD_RUN_URL"');
}
```

---

### Step 8 — Give Cloud Run Permission to Access Firebase Storage and Firestore

The Cloud Run service writes to Firebase Storage and Firestore. It needs permissions.

**8a. Find or create a service account for Cloud Run:**

During the `gcloud run deploy` command, Cloud Run uses the Compute Engine default service account unless you specify one. Find it in the GCP Console → IAM → Service Accounts. It looks like:

```
[PROJECT-NUMBER]-compute@developer.gserviceaccount.com
```

**8b. Grant it the required roles:**

```bash
# Permission to read/write Firebase Storage
gcloud projects add-iam-policy-binding docs-flip \
  --member="serviceAccount:[PROJECT-NUMBER]-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Permission to read/write Firestore
gcloud projects add-iam-policy-binding docs-flip \
  --member="serviceAccount:[PROJECT-NUMBER]-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

Replace `[PROJECT-NUMBER]` with your GCP project number (found in the GCP Console dashboard).

---

### Step 9 — Redeploy Firebase Cloud Functions

```bash
# From the project root
firebase deploy --only functions
```

After deployment, confirm the function shows in the Firebase Console under Functions.

---

### Step 10 — Test End to End

This is the verification test for Priority 1 completion. Do not skip any of these checks.

**10a. Upload a test PDF through the frontend.**  
Use a simple PDF — a 5 to 10 page document. Watch the dashboard status indicator.

**10b. Expected status progression:**
```
uploading → converting → ready
```

**10c. Verify in Firebase Storage:**  
Go to Firebase Console → Storage → `documents/{userId}/{documentId}/pages/`  
You should see files named `page_001.jpg`, `page_002.jpg`, etc.

**10d. Verify in Firestore:**  
Go to Firebase Console → Firestore → `documents` collection → find the document.  
`status` should be `"ready"`, `pageCount` should match the PDF page count, `pageUrls` should be a populated array.

**10e. Verify Cloud Run logs:**  
Go to GCP Console → Cloud Run → `docsflip-converter` → Logs.  
You should see `Conversion complete: documentId=...` for a successful run.

**10f. Verify the original PDF was cleaned up:**  
In Firebase Storage → `uploads/{userId}/` — the original PDF file should be gone.

**Priority 1 is complete when all six checks above pass.**

---

### Step 11 — Commit the Changes

Once the test passes, commit everything:

```bash
git add functions/convertPdf.js functions/package.json converter/
git commit -m "fix: replace PDF.js/sharp rendering with Cloud Run + poppler converter service"
git push origin main
```

---

## Part 4 — Why Each Previous Approach Failed (Reference)

This section is for clarity only. It explains why the loop happened so it does not happen again.

| Approach | Why It Failed |
|---|---|
| PDF.js + `canvas` npm package | `canvas` ships a native `.node` binary compiled for a specific OS/arch. The version installed on Mac or in CI is not compatible with the Firebase Gen1 Linux runtime. PDF.js calls canvas internals directly, causing `TypeError: Image or Canvas expected` |
| `pdfjs-dist` configuration flags (`disableWorker`, `isOffscreenCanvasSupported`, etc.) | These flags change PDF.js behaviour but do not fix the underlying canvas binary incompatibility. The system library problem persists regardless of flags |
| `sharp` reading PDFs directly | sharp can read PDFs only if the bundled `libvips` binary was compiled with poppler support. The sharp npm package ships without poppler. Firebase Functions has no system poppler. This approach also fails — different error, same root cause |
| Version pinning of `pdfjs-dist` or `canvas` | Different versions of the same packages have the same fundamental incompatibility with the managed runtime |

**The pattern:** All of these approaches tried to do PDF rendering inside the Firebase managed runtime. The managed runtime will never have the system libraries needed. The only fix is to move PDF rendering to an environment where you control the system libraries. Cloud Run with a custom Docker image is that environment.

---

## Part 5 — `UploadModal.jsx` Assessment

The `UploadModal.jsx` file is correctly implemented and does not need changes. It:
- Counts PDF pages client-side before upload (correct — prevents oversized uploads)
- Creates the Firestore document before uploading (correct — enables real-time status tracking)
- Uploads with `customMetadata` containing `documentId` and `userId` (correct — Cloud Function reads these)
- Listens to Firestore status in real time (correct — will update UI when Cloud Run completes)

No changes needed to this file.

---

## Part 6 — Files Summary

| File | Action | Why |
|---|---|---|
| `converter/Dockerfile` | **CREATE** | Docker container with poppler-utils for Cloud Run |
| `converter/server.js` | **CREATE** | Express server that runs pdftoppm and writes to Storage/Firestore |
| `converter/package.json` | **CREATE** | Dependencies for the converter service |
| `functions/convertPdf.js` | **REPLACE** | Now an orchestrator only — calls Cloud Run, no rendering |
| `functions/package.json` | **UPDATE** | Remove pdfjs-dist and canvas, keep axios |
| `components/UploadModal.jsx` | **NO CHANGE** | Already correct |
| `functions/index.js` | **NO CHANGE** | Already correct |
| `firebase.json` | **NO CHANGE** | Already correct |

---

## Part 7 — If Cloud Run Deployment Fails

Common issues and how to resolve them:

**`ERROR: (gcloud.run.deploy) PERMISSION_DENIED`**  
Run `gcloud auth login` and then `gcloud auth application-default login`. Re-run the deploy command.

**`ERROR: Build failed`**  
Check that the `converter/` directory contains exactly: `Dockerfile`, `server.js`, `package.json`. No missing files.

**`Cloud Run service deployed but conversion still fails`**  
Check the Cloud Run logs first (GCP Console → Cloud Run → Logs). The error message there will tell you what step failed. Common causes: IAM permissions not set correctly (Step 8), or the service account does not have Storage or Firestore access.

**`Function times out before Cloud Run responds`**  
The function timeout is set to 540 seconds in the `runWith` config. If PDFs are very large, increase the Cloud Run `--timeout` flag in the deploy command (maximum is 3600 seconds). Adjust `axios` timeout in `convertPdf.js` to match.

**`Status stays at 'converting' forever`**  
The Cloud Run service started but crashed before updating Firestore. Check Cloud Run logs for the error. Most likely the IAM permissions from Step 8 are missing.

---

*End of Fix Guide — Docsflip Conversion Pipeline*  
*Once Priority 1 passes all checks in Step 10, proceed to Priority 2: Flipbook Viewer.*
