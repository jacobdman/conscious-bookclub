const db = require("../../../../db/models/index");

const DASHBOARD_SECTIONS = [
  "habitLeaderboard",
  "nextMeeting",
  "quote",
  "quickGoals",
  "upcomingBooks",
  "feed",
];

const DEFAULT_DASHBOARD_CONFIG = DASHBOARD_SECTIONS.map((id) => ({id, enabled: true}));

const coerceArrayConfig = (config) => {
  // New shape already an array of objects
  if (Array.isArray(config)) {
    return config;
  }

  // Backward compatibility for old {order, sections} shape
  if (config && (Array.isArray(config.order) || config.sections)) {
    const order = Array.isArray(config.order) ? config.order : [];
    const sections = config.sections || {};

    const mapped = order
        .filter((id) => DASHBOARD_SECTIONS.includes(id))
        .map((id) => ({
          id,
          enabled: typeof sections[id]?.enabled === "boolean" ? sections[id].enabled : true,
        }));

    DASHBOARD_SECTIONS.forEach((id) => {
      if (!mapped.find((item) => item.id === id)) {
        mapped.push({
          id,
          enabled: typeof sections[id]?.enabled === "boolean" ? sections[id].enabled : true,
        });
      }
    });

    return mapped;
  }

  return [];
};

const sanitizeDashboardConfig = (config = []) => {
  const arrayConfig = coerceArrayConfig(config);
  const seen = new Set();
  const sanitized = [];

  arrayConfig.forEach((item) => {
    if (!item || !item.id || !DASHBOARD_SECTIONS.includes(item.id)) return;
    if (seen.has(item.id)) return;

    sanitized.push({
      id: item.id,
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
    });
    seen.add(item.id);
  });

  // Append any missing defaults
  DEFAULT_DASHBOARD_CONFIG.forEach((section) => {
    if (!seen.has(section.id)) {
      sanitized.push({...section});
    }
  });

  return sanitized;
};

// Helper function to verify user is member of club
const verifyMembership = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId, userId},
  });
  return membership;
};

// Helper function to verify user is owner of club
const verifyOwnership = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId, userId, role: "owner"},
  });
  return membership;
};

// Helper function to verify user can manage club (owner or admin)
const verifyManageAccess = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId, userId, role: {[db.Op.in]: ["owner", "admin"]}},
  });
  return membership;
};

// Helper function to generate a unique 10-character alphanumeric invite code
const generateInviteCode = async () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const codeLength = 10;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random code
    let code = "";
    for (let i = 0; i < codeLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const existingClub = await db.Club.findOne({
      where: {inviteCode: code},
    });

    if (!existingClub) {
      return code;
    }
  }

  // If we've exhausted all attempts, throw an error
  throw new Error("Failed to generate unique invite code after multiple attempts");
};

// GET /v1/clubs?userId=xxx - Get all clubs user belongs to
const getUserClubs = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    const memberships = await db.ClubMember.findAll({
      where: {userId},
      include: [
        {
          model: db.Club,
          as: "club",
        },
      ],
    });

    const clubs = memberships.map((membership) => {
      const clubData = {
        id: membership.club.id,
        name: membership.club.name,
        config: membership.club.config || {},
        dashboardConfig: sanitizeDashboardConfig(membership.club.dashboardConfig),
        role: membership.role,
        createdAt: membership.club.createdAt,
      };

      // Only include invite code for owners/admins
      if (["owner", "admin"].includes(membership.role)) {
        clubData.inviteCode = membership.club.inviteCode;
      }

      return clubData;
    });

    res.json(clubs);
  } catch (e) {
    next(e);
  }
};

// GET /v1/clubs/:clubId?userId=xxx - Get club details (verify membership)
const getClub = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify membership
    const membership = await verifyMembership(parseInt(clubId), userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    const club = await db.Club.findByPk(clubId);
    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    const response = {
      id: club.id,
      name: club.name,
      config: club.config || {},
      dashboardConfig: sanitizeDashboardConfig(club.dashboardConfig),
      role: membership.role,
      createdAt: club.createdAt,
    };

    // Only include invite code for owners/admins
    if (["owner", "admin"].includes(membership.role)) {
      response.inviteCode = club.inviteCode;
    }

    res.json(response);
  } catch (e) {
    next(e);
  }
};

// GET /v1/clubs/:clubId/members?userId=xxx - Get club members (verify membership)
const getClubMembers = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify membership
    const membership = await verifyMembership(parseInt(clubId), userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    const members = await db.ClubMember.findAll({
      where: {clubId: parseInt(clubId)},
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["uid", "email", "displayName", "photoUrl"],
        },
      ],
      order: [["role", "DESC"], ["created_at", "ASC"]], // Owners first
    });

    res.json(
        members.map((member) => ({
          userId: member.userId,
          role: member.role,
          user: {
            uid: member.user.uid,
            email: member.user.email,
            displayName: member.user.displayName,
            photoUrl: member.user.photoUrl,
          },
          joinedAt: member.createdAt,
        })),
    );
  } catch (e) {
    next(e);
  }
};

// PUT /v1/clubs/:clubId?userId=xxx - Update club name/config (owner only)
const updateClub = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;
    const updates = req.body;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify manage access
    const manageAccess = await verifyManageAccess(parseInt(clubId), userId);
    if (!manageAccess) {
      const error = new Error("Only club owners or admins can update club settings");
      error.status = 403;
      throw error;
    }

    const club = await db.Club.findByPk(clubId);
    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    // Only allow updating name and config
    if (updates.name !== undefined) {
      club.name = updates.name;
    }
    if (updates.config !== undefined) {
      club.config = updates.config;
    }
    if (updates.dashboardConfig !== undefined) {
      club.dashboardConfig = sanitizeDashboardConfig(updates.dashboardConfig);
    }

    await club.save();

    res.json({id: club.id, ...club.toJSON()});
  } catch (e) {
    next(e);
  }
};

// POST /v1/clubs/:clubId/members?userId=xxx - Add member (owner only)
const addClubMember = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;
    const {newUserId} = req.body;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!newUserId) {
      const error = new Error("newUserId is required");
      error.status = 400;
      throw error;
    }

    // Verify manage access
    const manageAccess = await verifyManageAccess(parseInt(clubId), userId);
    if (!manageAccess) {
      const error = new Error("Only club owners or admins can add members");
      error.status = 403;
      throw error;
    }

    // Check if user exists
    const user = await db.User.findByPk(newUserId);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Check if already a member
    const existingMember = await db.ClubMember.findOne({
      where: {clubId: parseInt(clubId), userId: newUserId},
    });

    if (existingMember) {
      const error = new Error("User is already a member of this club");
      error.status = 400;
      throw error;
    }

    // Add member
    const member = await db.ClubMember.create({
      clubId: parseInt(clubId),
      userId: newUserId,
      role: "member",
    });

    res.status(201).json({
      userId: member.userId,
      role: member.role,
      joinedAt: member.createdAt,
    });
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/clubs/:clubId/members/:memberUserId?userId=xxx - Remove member (owner only)
const removeClubMember = async (req, res, next) => {
  try {
    const {clubId, memberUserId} = req.params;
    const userId = req.query.userId;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify manage access
    const manageAccess = await verifyManageAccess(parseInt(clubId), userId);
    if (!manageAccess) {
      const error = new Error("Only club owners or admins can remove members");
      error.status = 403;
      throw error;
    }

    // Don't allow removing yourself if you're the only owner
    if (memberUserId === userId) {
      const ownerCount = await db.ClubMember.count({
        where: {clubId: parseInt(clubId), role: "owner"},
      });
      if (ownerCount === 1) {
        const error = new Error("Cannot remove the only owner of the club");
        error.status = 400;
        throw error;
      }
    }

    const member = await db.ClubMember.findOne({
      where: {clubId: parseInt(clubId), userId: memberUserId},
    });

    if (!member) {
      const error = new Error("Member not found");
      error.status = 404;
      throw error;
    }

    await member.destroy();
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};

// PUT /v1/clubs/:clubId/members/:memberUserId/role?userId=xxx - Update role (owner only)
const updateMemberRole = async (req, res, next) => {
  try {
    const {clubId, memberUserId} = req.params;
    const userId = req.query.userId;
    const {role} = req.body;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!role || !["member", "calendar-admin", "admin", "owner"].includes(role)) {
      const error = new Error("Invalid role. Must be 'member', 'calendar-admin', 'admin', or 'owner'");
      error.status = 400;
      throw error;
    }

    // Verify ownership (role changes remain owner-only)
    const ownership = await verifyOwnership(parseInt(clubId), userId);
    if (!ownership) {
      const error = new Error("Only club owners can update member roles");
      error.status = 403;
      throw error;
    }

    // Don't allow changing your own role if you're the only owner
    if (memberUserId === userId && role === "member") {
      const ownerCount = await db.ClubMember.count({
        where: {clubId: parseInt(clubId), role: "owner"},
      });
      if (ownerCount === 1) {
        const error = new Error("Cannot change role of the only owner");
        error.status = 400;
        throw error;
      }
    }

    const member = await db.ClubMember.findOne({
      where: {clubId: parseInt(clubId), userId: memberUserId},
    });

    if (!member) {
      const error = new Error("Member not found");
      error.status = 404;
      throw error;
    }

    member.role = role;
    await member.save();

    res.json({
      userId: member.userId,
      role: member.role,
      joinedAt: member.createdAt,
    });
  } catch (e) {
    next(e);
  }
};

// POST /v1/clubs/join - Join club by invite code
const joinClubByInviteCode = async (req, res, next) => {
  try {
    const {inviteCode, userId} = req.body;

    // Reject null, undefined, or empty invite codes
    if (!inviteCode || !inviteCode.trim()) {
      const error = new Error("inviteCode is required and cannot be empty");
      error.status = 400;
      throw error;
    }

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Find club by invite code (case-insensitive)
    // Only find clubs with non-null invite codes
    const normalizedCode = inviteCode.toUpperCase().trim();
    const club = await db.Club.findOne({
      where: {
        [db.Op.and]: [
          db.sequelize.where(
              db.sequelize.fn("UPPER", db.sequelize.col("invite_code")),
              normalizedCode,
          ),
          {inviteCode: {[db.Op.ne]: null}},
        ],
      },
    });

    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    // Double-check that the club has an invite code (shouldn't happen, but safety check)
    if (!club.inviteCode) {
      const error = new Error("This club does not have an invite code configured");
      error.status = 400;
      throw error;
    }

    // Verify user exists
    const user = await db.User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Check if user is already a member
    const existingMember = await db.ClubMember.findOne({
      where: {clubId: club.id, userId},
    });

    if (existingMember) {
      const error = new Error("User is already a member of this club");
      error.status = 400;
      throw error;
    }

    // Add user as member
    const member = await db.ClubMember.create({
      clubId: club.id,
      userId,
      role: "member",
    });

    res.status(201).json({
      clubId: club.id,
      clubName: club.name,
      userId: member.userId,
      role: member.role,
      joinedAt: member.createdAt,
    });
  } catch (e) {
    next(e);
  }
};

// POST /v1/clubs/:clubId/rotate-invite-code?userId=xxx - Rotate invite code (owner only)
const rotateInviteCode = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify manage access
    const manageAccess = await verifyManageAccess(parseInt(clubId), userId);
    if (!manageAccess) {
      const error = new Error("Only club owners or admins can rotate invite codes");
      error.status = 403;
      throw error;
    }

    const club = await db.Club.findByPk(clubId);
    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    // Generate new unique invite code
    const newInviteCode = await generateInviteCode();

    // Update club with new invite code
    await club.update({inviteCode: newInviteCode});

    res.json({
      clubId: club.id,
      inviteCode: newInviteCode,
    });
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/clubs/:clubId?userId=xxx - Delete club (owner only)
const deleteClub = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify ownership (delete remains owner-only)
    const ownership = await verifyOwnership(parseInt(clubId), userId);
    if (!ownership) {
      const error = new Error("Only club owners can delete clubs");
      error.status = 403;
      throw error;
    }

    const club = await db.Club.findByPk(clubId);
    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    await club.destroy();
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};

// POST /v1/clubs/:clubId/link-pending-request?userId=xxx
// Link pending club request to club (owner only)
const linkPendingRequest = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;
    const {email} = req.body;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!email || !email.trim()) {
      const error = new Error("email is required");
      error.status = 400;
      throw error;
    }

    // Verify manage access
    const manageAccess = await verifyManageAccess(parseInt(clubId), userId);
    if (!manageAccess) {
      const error = new Error("Only club owners or admins can link pending requests");
      error.status = 403;
      throw error;
    }

    const club = await db.Club.findByPk(clubId);
    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    // Find pending request by email (case-insensitive)
    const normalizedEmail = email.trim().toLowerCase();
    const pendingRequest = await db.PendingClubRequest.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (!pendingRequest) {
      const error = new Error("Pending club request not found for this email");
      error.status = 404;
      throw error;
    }

    // Update pending request with club_id
    await pendingRequest.update({
      clubId: parseInt(clubId),
    });

    res.json({
      message: "Pending club request linked successfully",
      pendingRequest: {
        id: pendingRequest.id,
        email: pendingRequest.email,
        clubId: pendingRequest.clubId,
      },
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getUserClubs,
  getClub,
  getClubMembers,
  updateClub,
  addClubMember,
  removeClubMember,
  updateMemberRole,
  joinClubByInviteCode,
  rotateInviteCode,
  deleteClub,
  linkPendingRequest,
};

