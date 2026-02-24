# Docsflip Conversion Pipeline Error Audit Report

**Prepared:** 2026-02-24  
**Project:** `docs-flip` (Firebase project ID)  
**Scope:** Priority 1 PDF Upload + Conversion Pipeline (`uploading -> converting -> ready`)  
**Current status:** Upload reaches `converting`, then falls to `error` for tested PDFs.

---

## 1. Executive Summary

The upload pipeline is wired and triggers Cloud Functions correctly, but PDF conversion fails at runtime during page rendering.

Primary recurring runtime error:

- `TypeError: Image or Canvas expected`
- Source stack repeatedly points to `pdfjs-dist` canvas rendering internals:
  - `drawImageAtIntegerCoords`
  - `CanvasGraphics.paintInlineImageXObject`
  - `CanvasGraphics.paintImageXObject`

This indicates a compatibility/runtime-rendering issue between PDF.js image rendering paths and the Node canvas environment used in 1st Gen Cloud Functions.

---

## 2. What Works

- Firebase project connected: `docs-flip`
- Firestore + Storage rules deploy successfully
- Functions deploy successfully on `nodejs20` (Gen1)
- Function `convertPdf` exists and is triggered by Storage finalize events
- Frontend upload flow works:
  - file upload completes (`100%`)
  - status moves `uploading -> converting`
- Authentication flow works enough to permit upload (login/register/dashboard auth state)

---

## 3. What Fails

- Final conversion stage fails and document status is set to `error`
- No successful transition to `ready` for tested PDFs in current failing runs

Observed errors from Cloud Function logs:

- `convertPdf error: TypeError: Image or Canvas expected`
- Stack references (examples):
  - `/workspace/node_modules/pdfjs-dist/legacy/build/pdf.js:11024:9`
  - `/workspace/node_modules/pdfjs-dist/legacy/build/pdf.js:12903:5`
  - `/workspace/node_modules/pdfjs-dist/legacy/build/pdf.js:12824:10`
  - `/workspace/node_modules/pdfjs-dist/legacy/build/pdf.js:11624:20`
- Also observed warning:
  - `fetchStandardFontData ... ensure that the standardFontDataUrl API parameter is provided`

---

## 4. Affected Files (Directly Linked to Error)

### Backend / Cloud Functions
- `functions/convertPdf.js`  
  Core failing function. Multiple revisions attempted for PDF.js + canvas configuration.
- `functions/package.json`  
  Runtime dependencies and versions (`pdfjs-dist`, `canvas`, `sharp`, `firebase-functions`, etc.)
- `functions/index.js`  
  Exports `convertPdf`

### Firebase config/runtime
- `firebase.json`  
  Functions runtime and deployment behavior (migrated from unsupported `nodejs24` to `nodejs20` for Gen1)

### Frontend status path (not root-cause, but user-visible)
- `components/UploadModal.jsx`  
  Creates document and listens to `status`; reflects `error` when function fails

---

## 5. Timeline of Key Technical Events

1. Initial deploy attempts failed because runtime was set to `nodejs24` on Gen1 (unsupported).  
   Error: `Runtime "nodejs24" is not supported on GCF Gen1`.
2. Runtime changed to `nodejs20`; functions deployed successfully.
3. Trigger started firing, but conversion failed at render step with `TypeError: Image or Canvas expected`.
4. Multiple conversion code variants tested:
   - `pdfjs-dist` ESM (`pdf.mjs`) with Node canvas factory
   - Added PDF.js toggles (`disableWorker`, `isOffscreenCanvasSupported`, `isImageDecoderSupported`, etc.)
   - Added standard font / cmap path hints
   - Downgrade attempts between PDF.js variants
5. Latest runs still fail during image/object rendering phase in PDF.js internals.

---

## 6. Environment & Deployment Notes

- Functions runtime: `nodejs20` (Gen1)
- Region: `us-central1`
- Trigger type: `google.storage.object.finalize`
- Bucket trigger resource references: `docs-flip.firebasestorage.app`
- Local machine Node: `v24.x` (engine warning expected; deployment still successful)

Non-blocking warnings observed:

- Node 20 deprecation warning for future dates (not immediate blocker)
- Local macOS duplicate class warning from `sharp` and `canvas` dylibs (local analysis-time warning; not definitive prod cause)

---

## 7. Root Cause Hypothesis

Most likely root cause is runtime incompatibility in PDF.js image/canvas rendering path for these source PDFs under Gen1 function environment.

Evidence:

- Trigger and deployment are healthy
- Failure consistently occurs inside PDF.js render execution of image XObjects
- Error is deterministic across multiple PDFs and code variants

---

## 8. Recommendations for External Consultant

### A. Primary recommendation (highest confidence)
Migrate conversion implementation away from PDF.js canvas rendering in Gen1 and use a renderer designed for server PDF rasterization stability, e.g.:

1. **Poppler (`pdftoppm`/`pdftocairo`) in Cloud Run or Gen2 with custom container**
2. **GraphicsMagick/ImageMagick + Ghostscript** in controlled container runtime
3. If staying in Firebase Functions: move to **Gen2** and validate native runtime compatibility

### B. If retaining PDF.js in Functions
- Validate against exact known-good matrix (Node runtime, pdfjs-dist version, canvas version)
- Pin and test with representative PDFs containing embedded images, transparency groups, and non-standard fonts
- Ensure standard font and cmap assets are bundled + referenced correctly

### C. Infrastructure recommendation
Given PDF conversion complexity, prefer **Cloud Run job/service** for conversion and keep Firebase Functions as trigger/orchestrator only.

Proposed pattern:
1. Storage finalize trigger in Functions
2. Push conversion task to Cloud Run endpoint/queue
3. Cloud Run converts pages and writes outputs
4. Firestore status updates from orchestrator (`converting` -> `ready` / `error`)

### D. Operational observability improvements
- Add correlation id per conversion attempt and log it to Firestore + function logs
- Persist `lastError` field (sanitized) in `documents` for fast triage
- Add explicit start/end logs for each page conversion index

---

## 9. Current Blocking Condition

Priority 1 cannot be marked complete until at least one end-to-end successful run verifies:

- `uploading -> converting -> ready`
- `pageCount` and `pageUrls` populated
- page images present in Storage in correct order
- source upload PDF cleaned up post-conversion

This condition is currently **not met** due to conversion runtime failure.

---

## 10. Artifacts to Share With Consultant

- This report: `CONVERSION_ERROR_AUDIT_REPORT_2026-02-24.md`
- Function file: `functions/convertPdf.js`
- Function deps/runtime: `functions/package.json`, `firebase.json`
- Representative failing PDFs used in testing
- Latest `convertPdf` Cloud logs showing stack trace

