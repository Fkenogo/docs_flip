// Triggered on PDF uploads and converts each PDF page into compressed JPEG images.
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const sharp = require('sharp');
const { createCanvas } = require('canvas');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Builds a zero-padded page image path to preserve page order.
function buildPagePath(userId, documentId, pageNumber) {
  const pageNum = String(pageNumber).padStart(3, '0');
  return `documents/${userId}/${documentId}/pages/page_${pageNum}.jpg`;
}

// Creates a PDF.js-compatible canvas factory backed by node-canvas.
function createNodeCanvasFactory() {
  return {
    create(width, height) {
      const canvas = createCanvas(width, height);
      return { canvas, context: canvas.getContext('2d') };
    },
    reset(target, width, height) {
      target.canvas.width = width;
      target.canvas.height = height;
    },
    destroy(target) {
      target.canvas.width = 0;
      target.canvas.height = 0;
      target.canvas = null;
      target.context = null;
    },
  };
}

exports.convertPdf = functions.storage.object().onFinalize(async (object) => {
  if (!object.name || !object.name.startsWith('uploads/')) return null;

  const { documentId, userId } = object.metadata || {};
  if (!documentId || !userId) return null;

  const bucket = admin.storage().bucket(object.bucket);
  const db = admin.firestore();
  const docRef = db.collection('documents').doc(documentId);

  try {
    await docRef.update({
      status: 'converting',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const tempPdfPath = path.join(os.tmpdir(), `${documentId}.pdf`);
    await bucket.file(object.name).download({ destination: tempPdfPath });

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfData = new Uint8Array(fs.readFileSync(tempPdfPath));
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;

    const pageCount = pdfDoc.numPages;
    const pageUrls = [];

    for (let i = 1; i <= pageCount; i += 1) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvasFactory = createNodeCanvasFactory();
      const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

      await page.render({
        canvasContext: canvasAndContext.context,
        viewport,
        canvasFactory,
      }).promise;

      const pngBuffer = canvasAndContext.canvas.toBuffer('image/png');
      const jpegBuffer = await sharp(pngBuffer)
        .jpeg({ quality: 80 })
        .toBuffer();

      const destPath = buildPagePath(userId, documentId, i);

      await bucket.file(destPath).save(jpegBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        },
      });

      await bucket.file(destPath).makePublic();
      pageUrls.push(`https://storage.googleapis.com/${bucket.name}/${destPath}`);

      canvasFactory.destroy(canvasAndContext);
    }

    const pdfUrl = `https://storage.googleapis.com/${bucket.name}/${object.name}`;

    await docRef.update({
      status: 'ready',
      pageCount,
      pageUrls,
      pdfUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await bucket.file(object.name).delete();
    fs.unlinkSync(tempPdfPath);

    return null;
  } catch (error) {
    await docRef.update({
      status: 'error',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.error('convertPdf error:', error);
    return null;
  }
});
