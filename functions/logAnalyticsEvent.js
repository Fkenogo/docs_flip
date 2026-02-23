// Placeholder callable for server-side analytics logging helper.
const functions = require('firebase-functions/v1');

exports.logAnalyticsEvent = functions.https.onCall(async () => {
  return { message: 'Not implemented in Priority 1' };
});
