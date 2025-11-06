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
    const [user] = await db.User.upsert({
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoUrl: userData.photoURL,
      lastLoginAt: new Date(),
    });
    res.status(201).json({id: user.uid, ...user.toJSON()});
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
};

