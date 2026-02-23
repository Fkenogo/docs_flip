// Exports all Cloud Functions from one entry point.
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const { convertPdf } = require('./convertPdf');
const { generateOfflineZip } = require('./generateOfflineZip');
const { verifyAndActivate } = require('./verifyAndActivate');
const { logAnalyticsEvent } = require('./logAnalyticsEvent');

module.exports = {
  convertPdf,
  generateOfflineZip,
  verifyAndActivate,
  logAnalyticsEvent,
};
