// Provides Storage path helpers to keep path rules consistent.

// Returns the upload path for a source PDF file.
export function getPdfUploadPath(userId, documentId) {
  return `uploads/${userId}/${documentId}.pdf`;
}

// Returns the generated page image path for a document page.
export function getPageImagePath(userId, documentId, pageNumber) {
  const pageNum = String(pageNumber).padStart(3, '0');
  return `documents/${userId}/${documentId}/pages/page_${pageNum}.jpg`;
}
