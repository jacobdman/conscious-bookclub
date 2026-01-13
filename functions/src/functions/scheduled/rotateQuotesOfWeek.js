const {onSchedule} = require("firebase-functions/v2/scheduler");
const db = require("../../../db/models/index");

// Runs every Sunday at 00:00 UTC
exports.rotateQuotesOfWeek = onSchedule(
    {
      schedule: "0 0 * * 0",
      timeZone: "UTC",
      region: "us-central1",
      maxInstances: 1,
      memory: "256MiB",
      timeoutSeconds: 300,
    },
    async () => {
      console.log("rotateQuotesOfWeek triggered");

      try {
        const clubs = await db.Club.findAll({
          attributes: ["id", "config"],
        });

        console.log(`Processing ${clubs.length} club(s) for quote rotation`);

        for (const club of clubs) {
          const quotes = await db.Quote.findAll({
            where: {clubId: club.id},
            attributes: ["id"],
          });

          if (!quotes.length) {
            if (club.config && club.config.quoteOfWeekId) {
              const newConfig = {...club.config};
              delete newConfig.quoteOfWeekId;
              await club.update({config: newConfig});
              console.log(`Cleared quoteOfWeekId for club ${club.id} (no quotes)`);
            }
            continue;
          }

          const randomQuote =
            quotes[Math.floor(Math.random() * quotes.length)];

          const newConfig = {...(club.config || {}), quoteOfWeekId: randomQuote.id};
          await club.update({config: newConfig});
          console.log(`Set quoteOfWeekId=${randomQuote.id} for club ${club.id}`);
        }

        console.log("rotateQuotesOfWeek completed");
      } catch (error) {
        console.error("rotateQuotesOfWeek failed", error);
        throw error;
      }
    },
);
