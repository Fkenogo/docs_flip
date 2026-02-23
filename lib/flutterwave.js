// Holds Flutterwave-related client helpers used by payment UI.

// Builds a stable transaction reference for document purchases.
export function buildTxRef(documentId) {
  return `DOC-${documentId}-${Date.now()}`;
}
