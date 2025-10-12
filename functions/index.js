const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.getHealth = functions.https.onRequest(async (req, res) => {
  const dbIsHealthy = await db.collection("users").get();
  if (dbIsHealthy.empty) {
    res.status(500).send("DB is not healthy");
  }
  res.send("OK");
});
