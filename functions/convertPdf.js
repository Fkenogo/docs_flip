// Triggered when a PDF is uploaded to uploads/.
// This function orchestrates conversion by calling the Cloud Run converter service.
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const { defineString } = require('firebase-functions/params');

const auth = new GoogleAuth();
const converterUrlParam = defineString('CONVERTER_URL');

// Builds an authenticated HTTP client for Cloud Run using ID token auth.
async function getCloudRunClient() {
  const converterUrl = converterUrlParam.value() || process.env.CONVERTER_URL || '';
  const client = await auth.getIdTokenClient(converterUrl);
  return client;
}

exports.convertPdf = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB',
  })
  .storage.object()
  .onFinalize(async (object) => {
    if (!object.name || !object.name.startsWith('uploads/')) return null;

    const { documentId, userId } = object.metadata || {};
    if (!documentId || !userId) {
      console.error('Missing metadata: documentId or userId not found on uploaded object');
      return null;
    }

    const db = admin.firestore();
    const docRef = db.collection('documents').doc(documentId);

    try {
      await docRef.update({
        status: 'converting',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const converterUrl = converterUrlParam.value() || process.env.CONVERTER_URL || '';
      if (!converterUrl) {
        throw new Error('CONVERTER_URL is empty');
      }

      const client = await getCloudRunClient();
      const targetUrl = `${converterUrl.replace(/\/$/, '')}/convert`;

      const response = await client.request({
        url: targetUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: {
          bucketName: object.bucket,
          filePath: object.name,
          documentId,
          userId,
        },
        timeout: 520000,
      });

      // Cloud Run service updates Firestore to ready/error; this log confirms call success.
      console.log(`Converter service responded: ${JSON.stringify(response.data)}`);
      return null;
    } catch (error) {
      console.error(`convertPdf orchestrator error for documentId=${documentId}:`, error.message);

      await docRef.update({
        status: 'error',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    }
  });
