const db = require("../../../../db/models/index");
const webpush = require("web-push");

// Mention regex pattern: @[displayName](userId)
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

// Configure web-push with VAPID keys (should be in environment variables)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@consciousbookclub.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

const sanitizeImages = (images) => {
  if (!images) return [];
  if (!Array.isArray(images)) return [];
  const maxImages = 5;
  return images
      .map((url) => (typeof url === "string" ? url.trim() : ""))
      .filter((url) => url.length > 0)
      .slice(0, maxImages);
};

// Helper function to send push notification
const sendPushNotification = async (subscription, title, body, data = {}) => {
  try {
    // Ensure subscription is an object (not a string)
    const subscriptionObj = typeof subscription === "string" ?
      JSON.parse(subscription) :
      subscription;

    const payload = JSON.stringify({
      title,
      body,
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
      data,
    });

    const result = await webpush.sendNotification(subscriptionObj, payload);
    return {success: true, statusCode: result.statusCode};
  } catch (error) {
    console.error("Error sending push notification:", {
      message: error.message,
      statusCode: error.statusCode,
    });

    // If subscription is invalid, delete it
    if (error.statusCode === 410 || error.statusCode === 404) {
      const subscriptionObj = typeof subscription === "string" ?
        JSON.parse(subscription) :
        subscription;
      await db.PushSubscription.destroy({
        where: {
          subscriptionJson: subscriptionObj,
        },
      });
    }
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
    };
  }
};

// Helper to emit Socket.io events via Cloud Run service
const emitToClub = async (clubId, event, data) => {
  try {
    // Determine Socket.io service URL
    // In production: use Cloud Run service URL
    // In local dev: use localhost
    // Check multiple ways to detect emulator:
    // 1. FUNCTIONS_EMULATOR env var (set by Firebase emulator)
    // 2. FIREBASE_EMULATOR_HUB env var (also set by Firebase emulator)
    // 3. GCLOUD_PROJECT not set or is demo-test
    const isEmulator =
      process.env.FUNCTIONS_EMULATOR === "true" ||
      !!process.env.FIREBASE_EMULATOR_HUB ||
      process.env.GCLOUD_PROJECT === "demo-test" ||
      !process.env.GCLOUD_PROJECT;

    // When running in emulator, always use localhost (ignore SOCKET_SERVICE_URL)
    // In production, use SOCKET_SERVICE_URL env var or default production URL
    const socketServiceUrl = isEmulator ?
      "http://localhost:3001" : // Local development - always use localhost
      (process.env.SOCKET_SERVICE_URL ||
        "https://socket-service-x3bxvqpcca-uc.a.run.app"); // Production

    console.log(`[API] Emit configuration:`, {
      isEmulator,
      socketServiceUrl,
      FUNCTIONS_EMULATOR: process.env.FUNCTIONS_EMULATOR,
      FIREBASE_EMULATOR_HUB: process.env.FIREBASE_EMULATOR_HUB,
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
      SOCKET_SERVICE_URL: process.env.SOCKET_SERVICE_URL,
    });

    const room = `club:${clubId}`;

    // Log data summary (avoid logging full data to prevent log spam)
    const dataSummary =
      event === "post:created" ?
        `postId=${data.id || "unknown"}` :
        event === "reaction:added" || event === "reaction:removed" ?
          `postId=${data.postId || "unknown"}` :
          "data prepared";

    console.log(`[API] Attempting to emit ${event} to ${room} - ${dataSummary}`);

    // Make HTTP POST to Socket.io service /emit endpoint
    const response = await fetch(`${socketServiceUrl}/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room,
        event,
        data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      const errorMsg =
        `[API] Failed to emit ${event} to ${room}: ` +
        `${response.status} ${response.statusText} - ${errorText}`;
      console.error(errorMsg);
    } else {
      const responseData = await response.json().catch(() => ({}));
      const memberCount = responseData.memberCount ?? "unknown";
      const successMsg =
        `[API] Successfully emitted ${event} to ${room} ` +
        `(${memberCount} members in room)`;
      console.log(successMsg);
    }
  } catch (error) {
    // Don't throw - Socket.io events are best-effort, don't break the API response
    const errorMsg =
      `[API] Socket.io emit failed (non-critical) for ${event} ` +
      `to club:${clubId}: ${error.message}`;
    console.error(errorMsg);
  }
};

// Shared includes for fetching posts with associations
const postIncludes = [
  {model: db.User, as: "author", attributes: ["uid", "displayName", "photoUrl"]},
  {
    model: db.PostReaction,
    as: "reactions",
    include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
  },
  {
    model: db.Post,
    as: "parentPost",
    attributes: ["id", "text", "authorName", "isSpoiler"],
    required: false,
    include: [
      {model: db.User, as: "author", attributes: ["uid", "displayName", "photoUrl"]},
    ],
  },
];

// Helper to load related record data for polymorphic posts
const loadRelatedRecord = async (type, id) => {
  if (!type || !id) return null;

  try {
    if (type === "meeting") {
      const meeting = await db.Meeting.findByPk(id, {
        include: [{
          model: db.Book,
          as: "book",
          attributes: ["id", "title", "author", "coverImage"],
        }],
      });
      return meeting ? {id: meeting.id, ...meeting.toJSON()} : null;
    }

    if (type === "book") {
      const book = await db.Book.findByPk(id, {
        attributes: ["id", "title", "author", "coverImage", "clubId"],
      });
      return book ? {id: book.id, ...book.toJSON()} : null;
    }

    if (type === "goal") {
      const goal = await db.Goal.findByPk(id, {
        attributes: [
          "id",
          "title",
          "type",
          "cadence",
          "targetCount",
          "targetQuantity",
          "unit",
          "clubId",
          "completedAt",
        ],
      });
      return goal ? {id: goal.id, ...goal.toJSON()} : null;
    }
  } catch (error) {
    console.error("Failed to load related record", {type, id, error: error.message});
  }

  return null;
};

// Helper to build response payload with related record data
const buildPostResponse = async (postInstance) => {
  if (!postInstance) return null;
  const json = postInstance.toJSON();

  let relatedRecord = null;
  if (json.relatedRecordType && json.relatedRecordId) {
    const record = await loadRelatedRecord(json.relatedRecordType, json.relatedRecordId);
    relatedRecord = {
      type: json.relatedRecordType,
      id: json.relatedRecordId,
      record,
    };
  }

  return {id: postInstance.id, ...json, relatedRecord};
};

// Helper to check which users are currently in a club's socket room
// Returns a Set of userIds that are actively viewing the feed
// If socket service is unavailable, returns empty Set (fail-safe - send notifications)
const checkUsersInRoom = async (clubId, userIds) => {
  try {
    // Determine Socket.io service URL (same logic as emitToClub)
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" ||
                       process.env.GCLOUD_PROJECT === "demo-test" ||
                       !process.env.GCLOUD_PROJECT;

    const socketServiceUrl = isEmulator ?
      "http://localhost:3001" : // Local development
      process.env.SOCKET_SERVICE_URL ||
      "https://socket-service-x3bxvqpcca-uc.a.run.app"; // Production

    const room = `club:${clubId}`;

    // Make HTTP POST to Socket.io service /check-room-members endpoint
    const response = await fetch(`${socketServiceUrl}/check-room-members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room,
        userIds: Array.isArray(userIds) ? userIds : [],
      }),
    });

    if (!response.ok) {
      console.error(
          `Failed to check room members for ${room}: ` +
        `${response.status} ${response.statusText}`,
      );
      // Fail-safe: return empty Set so notifications are still sent
      return new Set();
    }

    const result = await response.json();
    return new Set(result.userIdsInRoom || []);
  } catch (error) {
    // Fail-safe: if socket service is unavailable, return empty Set
    // This ensures notifications are still sent rather than being blocked
    console.log("Socket.io room check failed (non-critical):", error.message);
    return new Set();
  }
};

// GET /v1/posts - Get posts with pagination
const getPosts = async (req, res, next) => {
  try {
    const {clubId, limit, beforeId, includeActivity} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    // Default to 25 posts, max 100
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 25;

    const whereClause = {clubId: parseInt(clubId)};

    // Filter out activity posts when requested (default: include)
    const shouldIncludeActivity = includeActivity !== "false";
    if (!shouldIncludeActivity) {
      whereClause.isActivity = false;
    }

    // If beforeId is provided, only get posts older than that post
    if (beforeId) {
      const beforePost = await db.Post.findByPk(parseInt(beforeId));
      if (beforePost) {
        whereClause.created_at = {
          [db.Op.lt]: beforePost.created_at,
        };
      }
    }

    const posts = await db.Post.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
      limit: limitNum + 1, // Fetch one extra to check if there are more
      include: postIncludes,
    });

    // Check if there are more posts
    const hasMore = posts.length > limitNum;
    const postsToReturn = hasMore ? posts.slice(0, limitNum) : posts;

    const serializedPosts = await Promise.all(
        postsToReturn.map((post) => buildPostResponse(post)),
    );

    res.json({
      posts: serializedPosts,
      hasMore,
      // Return the oldest post's ID for next pagination
      nextBeforeId: hasMore ? postsToReturn[postsToReturn.length - 1].id : null,
    });
  } catch (e) {
    next(e);
  }
};

// GET /v1/posts/:postId - Get single post
const getPost = async (req, res, next) => {
  try {
    const {postId} = req.params;
    const {clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const post = await db.Post.findOne({
      where: {
        id: parseInt(postId),
        clubId: parseInt(clubId),
      },
      include: postIncludes,
    });
    if (!post) {
      const error = new Error("Post not found");
      error.status = 404;
      throw error;
    }
    const serializedPost = await buildPostResponse(post);
    res.json(serializedPost);
  } catch (e) {
    next(e);
  }
};

// POST /v1/posts - Create new post
const createPost = async (req, res, next) => {
  try {
    const {clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const postData = req.body;
    const clubIdInt = parseInt(clubId);
    const images = sanitizeImages(postData.images);

    // Extract mentioned user IDs from text
    const mentionedUserIds = [];
    if (postData.text) {
      let match;
      const regex = new RegExp(MENTION_REGEX);
      while ((match = regex.exec(postData.text)) !== null) {
        const userId = match[2];
        if (userId && !mentionedUserIds.includes(userId)) {
          mentionedUserIds.push(userId);
        }
      }
    }

    const post = await db.Post.create({
      ...postData,
      clubId: clubIdInt,
      isSpoiler: postData.isSpoiler || false,
      isActivity: postData.isActivity || false,
      images,
      mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : null,
    });

    // Fetch with associations for Socket.io event
    const postWithAssociations = await db.Post.findByPk(post.id, {include: postIncludes});
    const serializedPost = await buildPostResponse(postWithAssociations);

    // Emit Socket.io event via Cloud Run service
    await emitToClub(clubIdInt, "post:created", serializedPost);

    // Send feed notifications based on user preferences
    // This is non-blocking - don't fail the request if notifications fail
    if (vapidPublicKey && vapidPrivateKey) {
      try {
        // Get all club members
        const clubMembers = await db.ClubMember.findAll({
          where: {clubId: clubIdInt},
          include: [
            {
              model: db.User,
              as: "user",
            },
          ],
        });

        const authorName = postWithAssociations.authorName ||
            postWithAssociations.author?.displayName || "Someone";
        const isReply = !!postData.parentPostId;
        const hasMentions = mentionedUserIds.length > 0;
        let parentPostAuthorId = null;

        // If this is a reply, get the parent post author ID
        if (isReply && postData.parentPostId) {
          const parentPost = await db.Post.findByPk(postData.parentPostId, {
            attributes: ["authorId"],
          });
          if (parentPost) {
            parentPostAuthorId = parentPost.authorId;
          }
        }

        // Collect userIds that should receive notifications (before checking room membership)
        const userIdsToNotify = [];
        const mentionNotifications = new Set(); // Track users who should get mention notifications

        for (const member of clubMembers) {
          if (!member.user) continue;

          const user = member.user;
          const settings = user.notificationSettings || {};
          const feedSettings = settings.feed || {};

          // Skip if feed notifications are not enabled
          if (!feedSettings.enabled) continue;

          // Skip the post author (don't notify yourself)
          if (user.uid === postData.authorId) continue;

          let shouldNotify = false;

          // Check if user is mentioned (highest priority)
          if (hasMentions && mentionedUserIds.includes(user.uid)) {
            shouldNotify = true;
            mentionNotifications.add(user.uid);
          } else if (feedSettings.mode === "all") {
            // Notify for all new posts
            shouldNotify = true;
          } else if (feedSettings.mode === "mentions_replies") {
            // Only notify for replies to this user's posts
            if (isReply && parentPostAuthorId === user.uid) {
              shouldNotify = true;
            }
          }

          if (shouldNotify) {
            userIdsToNotify.push(user.uid);
          }
        }

        // Check which users are actively viewing the feed (in socket room)
        // Skip notifications for users who are already seeing updates in real-time
        const usersInRoom = await checkUsersInRoom(clubIdInt, userIdsToNotify);

        // Send notifications to members who have feed notifications enabled
        // and are not actively viewing the feed
        for (const member of clubMembers) {
          if (!member.user) continue;

          const user = member.user;
          const settings = user.notificationSettings || {};
          const feedSettings = settings.feed || {};

          // Skip if feed notifications are not enabled
          if (!feedSettings.enabled) continue;

          // Skip the post author (don't notify yourself)
          if (user.uid === postData.authorId) continue;

          // Skip if user is actively viewing the feed (already receiving real-time updates)
          if (usersInRoom.has(user.uid)) {
            console.log(`Skipping notification for user ${user.uid} - actively viewing feed`);
            continue;
          }

          let shouldNotify = false;
          let notificationTitle = "New Post";
          let notificationBody = "";

          // Check if user is mentioned (highest priority)
          if (mentionNotifications.has(user.uid)) {
            shouldNotify = true;
            // Extract text without mention markup for notification
            const regex = new RegExp(MENTION_REGEX);
            const displayText = postData.text.replace(regex, "@$1");
            const truncatedText = displayText.length > 60 ?
              displayText.substring(0, 60) + "..." :
              displayText;
            notificationTitle = "Mentioned in Post";
            notificationBody = `${authorName} has tagged you in a message: "${truncatedText}"`;
          } else if (feedSettings.mode === "all") {
            // Notify for all new posts
            shouldNotify = true;
          } else if (feedSettings.mode === "mentions_replies") {
            // Only notify for replies to this user's posts
            if (isReply && parentPostAuthorId === user.uid) {
              shouldNotify = true;
            }
          }

          // Set default notification text for non-mention notifications
          if (shouldNotify && !mentionNotifications.has(user.uid)) {
            if (isReply) {
              notificationTitle = "New Reply";
              notificationBody = `${authorName} replied to your post`;
            } else {
              // Truncate post text to ~50-60 characters for notification
              const regex = new RegExp(MENTION_REGEX);
              const displayText = postData.text.replace(regex, "@$1");
              const truncatedText = displayText.length > 60 ?
                displayText.substring(0, 60) + "..." :
                displayText;
              notificationBody = `${authorName}: ${truncatedText}`;
            }
          }

          if (shouldNotify) {
            // Get user's push subscriptions
            const subscriptions = await db.PushSubscription.findAll({
              where: {userId: user.uid},
            });

            // Send notification to all subscriptions with route data
            for (const subscription of subscriptions) {
              await sendPushNotification(
                  subscription.subscriptionJson,
                  notificationTitle,
                  notificationBody,
                  {
                    route: "/feed",
                    type: "feed",
                    clubId: clubIdInt,
                  },
              );
            }
          }
        }
      } catch (error) {
        // Log error but don't fail the request
        console.error("Error sending feed notifications:", error);
      }
    }

    res.status(201).json(serializedPost);
  } catch (e) {
    next(e);
  }
};

// POST /v1/posts/:postId/reactions - Add reaction
const addReaction = async (req, res, next) => {
  try {
    const {postId} = req.params;
    const {clubId} = req.query;
    const {emoji, userId} = req.body;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    if (!emoji || !userId) {
      const error = new Error("emoji and userId are required");
      error.status = 400;
      throw error;
    }

    // Verify post exists and belongs to club
    const post = await db.Post.findOne({
      where: {
        id: parseInt(postId),
        clubId: parseInt(clubId),
      },
    });

    if (!post) {
      const error = new Error("Post not found");
      error.status = 404;
      throw error;
    }

    // Create or find reaction (unique constraint handles duplicates)
    const [reaction, created] = await db.PostReaction.findOrCreate({
      where: {
        postId: parseInt(postId),
        userId,
        emoji,
      },
      defaults: {
        postId: parseInt(postId),
        userId,
        emoji,
      },
    });

    // Fetch all reactions for this post
    const reactions = await db.PostReaction.findAll({
      where: {postId: parseInt(postId)},
      include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
    });

    // Emit Socket.io event via Cloud Run service
    await emitToClub(parseInt(clubId), "reaction:added", {
      postId: parseInt(postId),
      reaction: reaction.toJSON(),
      reactions: reactions.map((r) => r.toJSON()),
    });

    res.status(created ? 201 : 200).json(reaction.toJSON());
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/posts/:postId/reactions/:emoji - Remove reaction
const removeReaction = async (req, res, next) => {
  try {
    const {postId, emoji} = req.params;
    const {clubId, userId} = req.query;

    if (!clubId || !userId) {
      const error = new Error("clubId and userId are required");
      error.status = 400;
      throw error;
    }

    // Verify post exists and belongs to club
    const post = await db.Post.findOne({
      where: {
        id: parseInt(postId),
        clubId: parseInt(clubId),
      },
    });

    if (!post) {
      const error = new Error("Post not found");
      error.status = 404;
      throw error;
    }

    // Delete reaction
    const deleted = await db.PostReaction.destroy({
      where: {
        postId: parseInt(postId),
        userId,
        emoji: decodeURIComponent(emoji),
      },
    });

    if (deleted === 0) {
      const error = new Error("Reaction not found");
      error.status = 404;
      throw error;
    }

    // Fetch remaining reactions for this post
    const reactions = await db.PostReaction.findAll({
      where: {postId: parseInt(postId)},
      include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
    });

    // Emit Socket.io event via Cloud Run service
    await emitToClub(parseInt(clubId), "reaction:removed", {
      postId: parseInt(postId),
      emoji: decodeURIComponent(emoji),
      userId,
      reactions: reactions.map((r) => r.toJSON()),
    });

    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};

// GET /v1/posts/:postId/reactions - Get all reactions for a post
const getReactions = async (req, res, next) => {
  try {
    const {postId} = req.params;
    const {clubId} = req.query;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    // Verify post exists and belongs to club
    const post = await db.Post.findOne({
      where: {
        id: parseInt(postId),
        clubId: parseInt(clubId),
      },
    });

    if (!post) {
      const error = new Error("Post not found");
      error.status = 404;
      throw error;
    }

    const reactions = await db.PostReaction.findAll({
      where: {postId: parseInt(postId)},
      include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
      order: [["created_at", "ASC"]],
    });

    res.json(reactions.map((r) => r.toJSON()));
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getPosts,
  getPost,
  createPost,
  addReaction,
  removeReaction,
  getReactions,
  emitToClub,
  postIncludes,
  buildPostResponse,
};

