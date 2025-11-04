// Migration script to copy data from Firestore to PostgreSQL
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const postgresService = require("./services/postgresService");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

/**
 * Migrates data from Firestore to PostgreSQL
 * @return {Promise<void>}
 */
async function migrateData() {
  console.log("Starting data migration from Firestore to PostgreSQL...");

  try {
    // Initialize PostgreSQL connection
    await postgresService.initializeDatabase();
    console.log("PostgreSQL connection established");

    // Migrate users
    console.log("Migrating users...");
    const usersSnapshot = await db.collection("users").get();
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      await postgresService.createUserDocument({
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
      });
    }
    console.log(`Migrated ${usersSnapshot.docs.length} users`);

    // Migrate books
    console.log("Migrating books...");
    const booksSnapshot = await db.collection("books").get();
    for (const doc of booksSnapshot.docs) {
      const bookData = doc.data();
      await postgresService.addBook({
        googleBooksId: bookData.googleBooksId,
        title: bookData.title,
        author: bookData.author,
        coverImage: bookData.coverImage,
        theme: bookData.theme || [],
        status: bookData.status || "active",
        discussionDate: bookData.discussionDate,
      });
    }
    console.log(`Migrated ${booksSnapshot.docs.length} books`);

    // Migrate posts
    console.log("Migrating posts...");
    const postsSnapshot = await db.collection("posts").get();
    for (const doc of postsSnapshot.docs) {
      const postData = doc.data();
      await postgresService.addPost({
        authorId: postData.authorId,
        authorName: postData.authorName,
        text: postData.text,
        reactionCounts: postData.reactionCounts || {thumbsUp: 0, thumbsDown: 0, heart: 0, laugh: 0},
      });
    }
    console.log(`Migrated ${postsSnapshot.docs.length} posts`);

    // Migrate meetings
    console.log("Migrating meetings...");
    const meetingsSnapshot = await db.collection("meetings").get();
    for (const doc of meetingsSnapshot.docs) {
      const meetingData = doc.data();
      // Note: This would need to be implemented in postgresService
      console.log("Meeting migration not yet implemented:", meetingData);
    }
    console.log(`Found ${meetingsSnapshot.docs.length} meetings (migration not implemented)`);

    // Migrate goals (nested collection)
    console.log("Migrating goals...");
    const usersForGoals = await db.collection("users").get();
    let totalGoals = 0;

    for (const userDoc of usersForGoals.docs) {
      const goalsSnapshot = await db.collection(`users/${userDoc.id}/goals`).get();
      for (const goalDoc of goalsSnapshot.docs) {
        const goalData = goalDoc.data();
        await postgresService.addGoal(userDoc.id, {
          title: goalData.title,
          type: goalData.type,
          frequency: goalData.frequency,
          milestones: goalData.milestones || [],
          archived: goalData.archived || false,
          completed: goalData.completed || false,
        });
        totalGoals++;
      }
    }
    console.log(`Migrated ${totalGoals} goals`);

    // Migrate book progress
    console.log("Migrating book progress...");
    const progressSnapshot = await db.collection("bookProgress").get();
    for (const doc of progressSnapshot.docs) {
      const progressData = doc.data();
      await postgresService.updateUserBookProgress(
          progressData.userId,
          progressData.bookId,
          {
            status: progressData.status,
            percentComplete: progressData.percentComplete,
            privacy: progressData.privacy || "public",
          },
      );
    }
    console.log(`Migrated ${progressSnapshot.docs.length} book progress records`);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData();
}

module.exports = {migrateData};
