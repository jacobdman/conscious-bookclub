const db = require("../../../../db/models/index");

// GET /v1/users - Get all users
const getUsers = async (req, res, next) => {
  try {
    const users = await db.User.findAll();
    res.json(users.map((user) => ({id: user.uid, ...user.toJSON()})));
  } catch (e) {
    next(e);
  }
};

// GET /v1/users/:userId - Get single user
const getUser = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const user = await db.User.findByPk(userId);

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({id: userId, ...user.toJSON()});
  } catch (e) {
    next(e);
  }
};

// POST /v1/users - Create user document
const createUser = async (req, res, next) => {
  try {
    const userData = req.body;
    const [user, created] = await db.User.upsert({
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoUrl: userData.photoURL,
      lastLoginAt: new Date(),
    });

    // If this is a new user, check for pending club requests
    if (created && userData.email) {
      try {
        const normalizedEmail = userData.email.trim().toLowerCase();

        // Find pending club request with club_id set (case-insensitive email match)
        const pendingRequest = await db.PendingClubRequest.findOne({
          where: {
            email: normalizedEmail,
            clubId: {[db.Op.ne]: null},
          },
          include: [
            {
              model: db.Club,
              as: "club",
            },
          ],
        });

        if (pendingRequest && pendingRequest.club) {
          // Verify club still exists
          const club = await db.Club.findByPk(pendingRequest.clubId);
          if (club) {
            // Check if user is already a member (shouldn't happen, but safety check)
            const existingMember = await db.ClubMember.findOne({
              where: {
                clubId: club.id,
                userId: user.uid,
              },
            });

            if (!existingMember) {
              // Create club membership with owner role
              await db.ClubMember.create({
                clubId: club.id,
                userId: user.uid,
                role: "owner",
              });

              // Delete the pending request
              await pendingRequest.destroy();
            }
          }
        }
      } catch (associationError) {
        // Log error but don't fail user creation
        console.error("Error associating user with pending club request:", associationError);
      }
    }

    res.status(201).json({id: user.uid, ...user.toJSON()});
  } catch (e) {
    next(e);
  }
};

// PATCH /v1/users/:userId/notification-preferences - Update user notification preferences
const updateNotificationPreferences = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const {
      notification_settings: notificationSettings,
      dailyGoalNotificationTime,
      dailyGoalNotificationsEnabled,
      timezone,
    } = req.body;

    const user = await db.User.findByPk(userId);

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    const updateData = {};

    // Handle new notification_settings JSON structure
    if (notificationSettings !== undefined) {
      updateData.notificationSettings = notificationSettings;

      // Map goal settings to existing fields for backward compatibility
      if (notificationSettings.goals) {
        if (notificationSettings.goals.enabled !== undefined) {
          updateData.dailyGoalNotificationsEnabled =
              notificationSettings.goals.enabled;
        }
        if (notificationSettings.goals.time !== undefined) {
          updateData.dailyGoalNotificationTime = notificationSettings.goals.time;
        }
      }
    }

    // Support legacy fields for backward compatibility
    if (dailyGoalNotificationTime !== undefined) {
      updateData.dailyGoalNotificationTime = dailyGoalNotificationTime;
      // Also update notification_settings if it exists
      if (user.notificationSettings) {
        const settings = {...user.notificationSettings};
        if (!settings.goals) settings.goals = {};
        settings.goals.time = dailyGoalNotificationTime;
        updateData.notificationSettings = settings;
      }
    }
    if (dailyGoalNotificationsEnabled !== undefined) {
      updateData.dailyGoalNotificationsEnabled = dailyGoalNotificationsEnabled;
      // Also update notification_settings if it exists
      if (user.notificationSettings) {
        const settings = {...user.notificationSettings};
        if (!settings.goals) settings.goals = {};
        settings.goals.enabled = dailyGoalNotificationsEnabled;
        updateData.notificationSettings = settings;
      }
    }
    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }

    await user.update(updateData);

    res.json({id: userId, ...user.toJSON()});
  } catch (e) {
    next(e);
  }
};

// PATCH /v1/users/:userId/profile - Update user profile (displayName, photoUrl)
const updateProfile = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const {displayName, photoUrl, settings} = req.body;

    // Verify userId is provided in query for security (user can only update their own profile)
    const requestUserId = req.query.userId;
    if (!requestUserId) {
      const error = new Error("userId is required in query");
      error.status = 400;
      throw error;
    }

    // Security check: userId in params must match userId in query
    if (userId !== requestUserId) {
      const error = new Error("You can only update your own profile");
      error.status = 403;
      throw error;
    }

    const user = await db.User.findByPk(userId);

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    const updateData = {};
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (photoUrl !== undefined) {
      updateData.photoUrl = photoUrl;
    }
    if (settings !== undefined) {
      if (settings && typeof settings === "object") {
        const existingSettings = user.settings || {};
        updateData.settings = {
          ...existingSettings,
          ...settings,
        };
      } else if (settings === null) {
        updateData.settings = null;
      } else {
        const error = new Error("settings must be an object");
        error.status = 400;
        throw error;
      }
    }

    await user.update(updateData);

    res.json({id: userId, ...user.toJSON()});
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateNotificationPreferences,
  updateProfile,
};

