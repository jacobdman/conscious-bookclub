const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.getLeaderboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const usersSnapshot = await db.collection("users").get();
  const users = usersSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

  const leaderboard = await Promise.all(users.map(async (user) => {
    const goalsSnapshot = await db
        .collection("user_goals")
        .where("userId", "==", user.id)
        .where("active", "==", true)
        .get();
    if (goalsSnapshot.empty) {
      return {name: user.displayName, progress: 0};
    }

    let totalProgress = 0;
    let goalCount = 0;

    for (const goalDoc of goalsSnapshot.docs) {
      const goal = goalDoc.data();
      const goalId = goalDoc.id;
      goalCount++;

      const today = new Date();
      const startOfWeek = today.getDate() - today.getDay();
      const weekStart = new Date(today.setDate(startOfWeek));
      weekStart.setHours(0, 0, 0, 0);

      const checksSnapshot = await db.collection("goal_checks")
          .where("goalId", "==", goalId)
          .where("userId", "==", user.id)
          .where("date", ">=", admin.firestore.Timestamp.fromDate(weekStart))
          .get();

      const completedCount = checksSnapshot.size;
      const progress = (completedCount / goal.cadence) * 100;
      totalProgress += Math.min(progress, 100); // Cap progress at 100%
    }

    const averageProgress = goalCount > 0 ? totalProgress / goalCount : 0;
    return {name: user.displayName, progress: averageProgress};
  }));

  return leaderboard;
});
