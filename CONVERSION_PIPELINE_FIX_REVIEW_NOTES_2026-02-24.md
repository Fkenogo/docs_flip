# Review Notes — Docsflip_Conversion_Pipeline_Fix.md

## Verdict
The guide is strong and the Cloud Run + poppler approach is the correct unblock for Priority 1.

## Required Adjustments Before Implementation

1. **Cloud Run auth is missing in orchestrator code**
- Guide deploys Cloud Run with `--no-allow-unauthenticated` (correct).
- But sample `functions/convertPdf.js` uses plain `axios.post()` and does not attach an ID token.
- This will return HTTP 401/403 from Cloud Run.
- Fix: use `google-auth-library` in the function to obtain an ID token for the Cloud Run URL and send `Authorization: Bearer <token>`.

2. **Region alignment should match current deployed function region**
- Existing function deploys are in `us-central1`.
- Guide suggests Cloud Run region `europe-west1`.
- Cross-region calls add latency and can increase failure surface.
- Recommendation: deploy Cloud Run in `us-central1` for now to match function and bucket trigger path.

3. **Some guide statements are over-absolute**
- The statement that no npm combination can ever work is too absolute.
- Practical conclusion remains valid for this project: current PDF.js/canvas path is unstable and repeatedly failing, so move rendering to Cloud Run.

## Implementation Decision
Proceed with guide architecture, applying the two technical corrections above.
