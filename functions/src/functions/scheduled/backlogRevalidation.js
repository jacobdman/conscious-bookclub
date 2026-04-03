const {onSchedule} = require("firebase-functions/v2/scheduler");
const db = require("../../../db/models/index");
const {Op} = db.Sequelize;

/**
 * Monthly: flag backlog books for community re-validation.
 * Sets revalidation_requested_at where null so they appear in Backlog Review queue.
 */
exports.backlogRevalidation = onSchedule(
    {
      schedule: "0 3 1 * *",
      timeZone: "UTC",
      region: "us-central1",
      maxInstances: 1,
      memory: "256MiB",
      timeoutSeconds: 300,
    },
    async () => {
      console.log("backlogRevalidation triggered");
      const now = new Date();
      try {
        const [updated] = await db.Book.update(
            {revalidationRequestedAt: now},
            {
              where: {
                pool: "backlog",
                revalidationRequestedAt: {[Op.eq]: null},
                chosenForBookclub: false,
              },
            },
        );
        console.log(`backlogRevalidation: updated ${updated} book(s)`);
      } catch (error) {
        console.error("backlogRevalidation failed", error);
        throw error;
      }
    },
);
