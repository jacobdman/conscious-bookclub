// PostgreSQL service implementation using Sequelize ORM
/* eslint-disable new-cap */
const {Sequelize, DataTypes} = require("sequelize");

// Initialize Sequelize connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false, // Set to console.log for debugging
  define: {
    timestamps: true,
    underscored: true, // Use snake_case for column names
  },
});

// Define models
const User = sequelize.define("User", {
  uid: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  displayName: {
    type: DataTypes.STRING,
    field: "display_name",
  },
  photoUrl: {
    type: DataTypes.TEXT,
    field: "photo_url",
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: "last_login_at",
  },
}, {
  tableName: "users",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

const Book = sequelize.define("Book", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  googleBooksId: {
    type: DataTypes.STRING,
    field: "google_books_id",
    unique: true,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  author: {
    type: DataTypes.STRING(500),
  },
  coverImage: {
    type: DataTypes.TEXT,
    field: "cover_image",
  },
  theme: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: "active",
  },
  discussionDate: {
    type: DataTypes.DATEONLY,
    field: "discussion_date",
  },
}, {
  tableName: "books",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

const Meeting = sequelize.define("Meeting", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING(255),
  },
  bookId: {
    type: DataTypes.INTEGER,
    field: "book_id",
    references: {
      model: Book,
      key: "id",
    },
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: "meetings",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

const Post = sequelize.define("Post", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  authorId: {
    type: DataTypes.STRING,
    field: "author_id",
    references: {
      model: User,
      key: "uid",
    },
  },
  authorName: {
    type: DataTypes.STRING(255),
    field: "author_name",
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  reactionCounts: {
    type: DataTypes.JSONB,
    field: "reaction_counts",
    defaultValue: {thumbsUp: 0, thumbsDown: 0, heart: 0, laugh: 0},
  },
}, {
  tableName: "posts",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

const Goal = sequelize.define("Goal", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    field: "user_id",
    references: {
      model: User,
      key: "uid",
    },
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  frequency: {
    type: DataTypes.STRING(50),
  },
  milestones: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  completedAt: {
    type: DataTypes.DATE,
    field: "completed_at",
  },
}, {
  tableName: "goals",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

const GoalCompletion = sequelize.define("GoalCompletion", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    field: "user_id",
    references: {
      model: User,
      key: "uid",
    },
  },
  goalId: {
    type: DataTypes.INTEGER,
    field: "goal_id",
    references: {
      model: Goal,
      key: "id",
    },
  },
  periodId: {
    type: DataTypes.STRING(100),
    field: "period_id",
    allowNull: false,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    field: "completed_at",
  },
}, {
  tableName: "goal_completions",
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ["user_id", "goal_id", "period_id"],
    },
  ],
});

const BookProgress = sequelize.define("BookProgress", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    field: "user_id",
    references: {
      model: User,
      key: "uid",
    },
  },
  bookId: {
    type: DataTypes.INTEGER,
    field: "book_id",
    references: {
      model: Book,
      key: "id",
    },
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: "not_started",
  },
  percentComplete: {
    type: DataTypes.INTEGER,
    field: "percent_complete",
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
  },
  privacy: {
    type: DataTypes.STRING(20),
    defaultValue: "public",
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: "updated_at",
  },
}, {
  tableName: "book_progress",
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ["user_id", "book_id"],
    },
  ],
});

// Define associations
User.hasMany(Post, {foreignKey: "authorId"});
User.hasMany(Goal, {foreignKey: "userId"});
User.hasMany(GoalCompletion, {foreignKey: "userId"});
User.hasMany(BookProgress, {foreignKey: "userId"});

Book.hasMany(Meeting, {foreignKey: "bookId"});
Book.hasMany(BookProgress, {foreignKey: "bookId"});

Goal.hasMany(GoalCompletion, {foreignKey: "goalId"});

Post.belongsTo(User, {foreignKey: "authorId"});
Meeting.belongsTo(Book, {foreignKey: "bookId"});
Goal.belongsTo(User, {foreignKey: "userId"});
GoalCompletion.belongsTo(User, {foreignKey: "userId"});
GoalCompletion.belongsTo(Goal, {foreignKey: "goalId"});
BookProgress.belongsTo(User, {foreignKey: "userId"});
BookProgress.belongsTo(Book, {foreignKey: "bookId"});

// Service functions for database operations
const getPosts = async () => {
  const posts = await Post.findAll({
    order: [["created_at", "DESC"]],
    include: [{model: User, attributes: ["uid", "displayName", "photoUrl"]}],
  });
  return {
    docs: posts.map((post) => ({id: post.id, data: () => post.toJSON()})),
  };
};

const addPost = async (postData) => {
  const post = await Post.create(postData);
  return {id: post.id};
};

const getBooks = async () => {
  const books = await Book.findAll({
    order: [["created_at", "DESC"]],
  });
  return {
    docs: books.map((book) => ({id: book.id, data: () => book.toJSON()})),
  };
};

const addBook = async (bookData) => {
  const book = await Book.create({
    ...bookData,
    createdAt: new Date(),
  });
  return {id: book.id};
};

const updateBook = async (bookId, updates) => {
  await Book.update(updates, {where: {id: bookId}});
};

const deleteBook = async (bookId) => {
  await Book.destroy({where: {id: bookId}});
};

const getMeetings = async () => {
  const meetings = await Meeting.findAll({
    order: [["date", "ASC"]],
    include: [{model: Book, attributes: ["id", "title", "author"]}],
  });
  return {
    docs: meetings.map((meeting) => ({
      id: meeting.id,
      data: () => meeting.toJSON(),
    })),
  };
};

const getGoals = async (userId) => {
  const goals = await Goal.findAll({
    where: {userId},
    order: [["created_at", "DESC"]],
  });
  return {
    docs: goals.map((goal) => ({id: goal.id, data: () => goal.toJSON()})),
  };
};

const addGoal = async (userId, goalData) => {
  const goal = await Goal.create({
    ...goalData,
    userId,
    createdAt: new Date(),
  });
  return {id: goal.id};
};

const updateGoal = async (userId, goalId, updates) => {
  await Goal.update(updates, {where: {id: goalId, userId}});
};

const deleteGoal = async (userId, goalId) => {
  await Goal.destroy({where: {id: goalId, userId}});
};

const checkGoalCompletion = async (userId, goalId, periodId) => {
  const completion = await GoalCompletion.findOne({
    where: {userId, goalId, periodId},
  });
  return !!completion;
};

const markGoalComplete = async (userId, goalId, periodId) => {
  await GoalCompletion.upsert({
    userId,
    goalId,
    periodId,
    completed: true,
    completedAt: new Date(),
  });
};

const markGoalIncomplete = async (userId, goalId, periodId) => {
  await GoalCompletion.destroy({
    where: {userId, goalId, periodId},
  });
};

const markMilestoneComplete = async (userId, goalId, milestoneIndex) => {
  const goal = await Goal.findOne({where: {id: goalId, userId}});
  if (goal) {
    const milestones = [...goal.milestones];
    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      completed: true,
      completedAt: new Date(),
    };
    await goal.update({milestones});
  }
};

const markOneTimeGoalComplete = async (userId, goalId) => {
  await Goal.update(
      {completed: true, completedAt: new Date()},
      {where: {id: goalId, userId}},
  );
};

const createUserDocument = async (user) => {
  const [userRecord] = await User.upsert({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoURL,
    lastLoginAt: new Date(),
  });
  return userRecord;
};

const getUserDocument = async (userId) => {
  const user = await User.findByPk(userId);
  return user ?
    {exists: () => true, data: () => user.toJSON()} :
    {exists: () => false};
};

const getBooksPage = async (
    pageNumber = 1,
    pageSize = 10,
    orderByField = "created_at",
    orderDirection = "DESC",
    userId = null,
) => {
  const offset = (pageNumber - 1) * pageSize;

  const includeOptions = [];
  if (userId) {
    includeOptions.push({
      model: BookProgress,
      where: {userId},
      required: false,
      attributes: ["id", "userId", "bookId", "status", "percentComplete", "privacy", "updatedAt"],
    });
  }

  const queryOptions = {
    order: [[orderByField, orderDirection]],
    limit: pageSize,
    offset,
  };

  if (includeOptions.length > 0) {
    queryOptions.include = includeOptions;
  }

  const {count, rows} = await Book.findAndCountAll(queryOptions);

  return {
    books: rows.map((book) => {
      const bookData = book.toJSON();
      // Set progress to first element of BookProgresses array if present
      bookData.progress = bookData.BookProgresses && bookData.BookProgresses.length > 0 ?
        bookData.BookProgresses[0] : null;
      return {
        id: book.id,
        ...bookData,
      };
    }),
    totalCount: count,
  };
};

const getBooksPageFiltered = async (
    theme,
    pageNumber = 1,
    pageSize = 10,
    orderByField = "created_at",
    orderDirection = "DESC",
    userId = null,
) => {
  const offset = (pageNumber - 1) * pageSize;
  let whereClause = {};

  if (theme === "no-theme") {
    whereClause = {
      [Sequelize.Op.or]: [
        {theme: null},
        {theme: []},
      ],
    };
  } else if (theme !== "all") {
    whereClause = {
      theme: {
        [Sequelize.Op.contains]: [theme],
      },
    };
  }

  const includeOptions = [];
  if (userId) {
    includeOptions.push({
      model: BookProgress,
      where: {userId},
      required: false,
      attributes: ["id", "userId", "bookId", "status", "percentComplete", "privacy", "updatedAt"],
    });
  }

  const queryOptions = {
    where: whereClause,
    order: [[orderByField, orderDirection]],
    limit: pageSize,
    offset,
  };

  if (includeOptions.length > 0) {
    queryOptions.include = includeOptions;
  }

  const {count, rows} = await Book.findAndCountAll(queryOptions);

  return {
    books: rows.map((book) => {
      const bookData = book.toJSON();
      // Set progress to first element of BookProgresses array if present
      bookData.progress = bookData.BookProgresses && bookData.BookProgresses.length > 0 ?
        bookData.BookProgresses[0] : null;
      return {
        id: book.id,
        ...bookData,
      };
    }),
    totalCount: count,
  };
};

const getUserBookProgress = async (userId, bookId) => {
  const progress = await BookProgress.findOne({
    where: {userId, bookId},
  });
  return progress ? {id: progress.id, ...progress.toJSON()} : null;
};

const getAllUserBookProgress = async (userId) => {
  const progress = await BookProgress.findAll({
    where: {userId},
    include: [{
      model: Book,
      attributes: ["id", "title", "author", "coverImage"],
    }],
  });
  return progress.map((p) => ({id: p.id, ...p.toJSON()}));
};

const updateUserBookProgress = async (userId, bookId, progressData) => {
  const [progress] = await BookProgress.upsert({
    userId,
    bookId,
    ...progressData,
    updatedAt: new Date(),
  });
  return {id: progress.id, ...progress.toJSON()};
};

const getAllUsersProgressForBook = async (bookId) => {
  const progress = await BookProgress.findAll({
    where: {bookId, privacy: "public"},
    include: [{model: User, attributes: ["uid", "displayName", "photoUrl"]}],
  });
  return progress.map((p) => ({id: p.id, ...p.toJSON()}));
};

const deleteUserBookProgress = async (userId, bookId) => {
  await BookProgress.destroy({where: {userId, bookId}});
};

const getAllUsers = async () => {
  const users = await User.findAll();
  return {
    docs: users.map((user) => ({id: user.uid, data: () => user.toJSON()})),
  };
};

const getAllDiscussedBooks = async () => {
  const books = await Book.findAll({
    where: {
      discussionDate: {
        [Sequelize.Op.ne]: null,
      },
    },
  });
  return books.map((book) => ({id: book.id, ...book.toJSON()}));
};

// Stats functions (computed on-demand)
const getUserStats = async (userId) => {
  const finishedCount = await BookProgress.count({
    where: {userId, status: "finished"},
  });

  const lastFinished = await BookProgress.findOne({
    where: {userId, status: "finished"},
    order: [["updated_at", "DESC"]],
  });

  const user = await User.findByPk(userId);

  return {
    id: userId,
    finishedCount,
    lastFinishedAt: lastFinished?.updatedAt,
    displayName: user?.displayName || "Unknown User",
    photoUrl: user?.photoUrl,
  };
};

const getTopFinishedBooksUsers = async (limitCount = 10) => {
  const results = await BookProgress.findAll({
    attributes: [
      "userId",
      [sequelize.fn("COUNT", sequelize.col("BookProgress.id")), "finishedCount"],
    ],
    where: {status: "finished"},
    group: [
      "userId",
      "User.uid",
      "User.display_name",
      "User.photo_url",
    ],
    order: [[sequelize.fn("COUNT", sequelize.col("BookProgress.id")), "DESC"]],
    limit: limitCount,
    include: [{
      model: User,
      attributes: ["uid", "displayName", "photoUrl"],
      required: true,
    }],
  });

  return results.map((result) => ({
    id: result.userId,
    finishedCount: parseInt(result.dataValues.finishedCount),
    displayName: result.User?.displayName || "Unknown User",
    photoUrl: result.User?.photoUrl,
  }));
};

const getBookStats = async (bookId) => {
  const stats = await BookProgress.findAll({
    attributes: [
      "status",
      [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      [sequelize.fn("AVG", sequelize.col("percent_complete")), "avgPercent"],
    ],
    where: {bookId},
    group: ["status"],
  });

  let activeReaders = 0;
  let finishedReaders = 0;
  let avgPercent = 0;
  let readerCount = 0;

  stats.forEach((stat) => {
    const count = parseInt(stat.dataValues.count);
    readerCount += count;

    if (stat.status === "reading") {
      activeReaders = count;
    } else if (stat.status === "finished") {
      finishedReaders = count;
    }

    if (stat.dataValues.avgPercent) {
      avgPercent = parseFloat(stat.dataValues.avgPercent);
    }
  });

  return {
    id: bookId,
    activeReaders,
    finishedReaders,
    readerCount,
    avgPercent: Math.round(avgPercent * 100) / 100,
  };
};

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connection established successfully.");

    // Note: We don't sync models here because the database schema
    // is managed via SQL migrations. The tables should already exist.
    // If you need to create tables, run the schema.sql file first.
  } catch (error) {
    console.error("Unable to connect to PostgreSQL:", error);
    throw error;
  }
};

module.exports = {
  // Initialize
  initializeDatabase,

  // Posts
  getPosts,
  addPost,

  // Books
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  getBooksPage,
  getBooksPageFiltered,
  getAllDiscussedBooks,

  // Meetings
  getMeetings,

  // Goals
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  checkGoalCompletion,
  markGoalComplete,
  markGoalIncomplete,
  markMilestoneComplete,
  markOneTimeGoalComplete,

  // Users
  createUserDocument,
  getUserDocument,
  getAllUsers,

  // Progress
  getUserBookProgress,
  getAllUserBookProgress,
  updateUserBookProgress,
  getAllUsersProgressForBook,
  deleteUserBookProgress,

  // Stats
  getUserStats,
  getTopFinishedBooksUsers,
  getBookStats,
};
