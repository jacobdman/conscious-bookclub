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
  measure: {
    type: DataTypes.STRING(50),
  },
  cadence: {
    type: DataTypes.STRING(50),
  },
  targetCount: {
    type: DataTypes.INTEGER,
    field: "target_count",
  },
  targetQuantity: {
    type: DataTypes.DECIMAL,
    field: "target_quantity",
  },
  unit: {
    type: DataTypes.STRING(100),
  },
  dueAt: {
    type: DataTypes.DATE,
    field: "due_at",
  },
  visibility: {
    type: DataTypes.STRING(50),
    defaultValue: "public",
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

const GoalEntry = sequelize.define("GoalEntry", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  goalId: {
    type: DataTypes.INTEGER,
    field: "goal_id",
    references: {
      model: Goal,
      key: "id",
    },
  },
  userId: {
    type: DataTypes.STRING,
    field: "user_id",
    references: {
      model: User,
      key: "uid",
    },
  },
  occurredAt: {
    type: DataTypes.DATE,
    field: "occurred_at",
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL,
  },
}, {
  tableName: "goal_entry",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

const Milestone = sequelize.define("Milestone", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  goalId: {
    type: DataTypes.INTEGER,
    field: "goal_id",
    references: {
      model: Goal,
      key: "id",
    },
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  done: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  doneAt: {
    type: DataTypes.DATE,
    field: "done_at",
  },
}, {
  tableName: "milestone",
  timestamps: false,
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
User.hasMany(GoalEntry, {foreignKey: "userId"});
User.hasMany(BookProgress, {foreignKey: "userId"});

Book.hasMany(Meeting, {foreignKey: "bookId"});
Book.hasMany(BookProgress, {foreignKey: "bookId"});

Goal.hasMany(GoalCompletion, {foreignKey: "goalId"});
Goal.hasMany(GoalEntry, {foreignKey: "goalId"});
Goal.hasMany(Milestone, {foreignKey: "goalId"});

Post.belongsTo(User, {foreignKey: "authorId"});
Meeting.belongsTo(Book, {foreignKey: "bookId"});
Goal.belongsTo(User, {foreignKey: "userId"});
GoalCompletion.belongsTo(User, {foreignKey: "userId"});
GoalCompletion.belongsTo(Goal, {foreignKey: "goalId"});
GoalEntry.belongsTo(User, {foreignKey: "userId"});
GoalEntry.belongsTo(Goal, {foreignKey: "goalId"});
Milestone.belongsTo(Goal, {foreignKey: "goalId"});
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
    include: [
      {
        model: Milestone,
        attributes: ["id", "title", "done", "doneAt"],
      },
    ],
  });
  return {
    docs: goals.map((goal) => {
      const goalData = goal.toJSON();
      // Convert milestones array to match expected format
      goalData.milestones = goalData.Milestones || [];
      return {id: goal.id, data: () => goalData};
    }),
  };
};

const addGoal = async (userId, goalData) => {
  // Validate goal type invariants
  const {type, measure, cadence, targetCount, targetQuantity, unit} = goalData;

  if (type === "habit") {
    if (measure !== "count") {
      throw new Error("Habit goals must have measure='count'");
    }
    if (!cadence) {
      throw new Error("Habit goals must have cadence");
    }
    if (!targetCount) {
      throw new Error("Habit goals must have target_count");
    }
  } else if (type === "metric") {
    if (measure !== "sum") {
      throw new Error("Metric goals must have measure='sum'");
    }
    if (!cadence) {
      throw new Error("Metric goals must have cadence");
    }
    if (!targetQuantity) {
      throw new Error("Metric goals must have target_quantity");
    }
    if (!unit) {
      throw new Error("Metric goals must have unit");
    }
  }

  const goal = await Goal.create({
    ...goalData,
    userId,
    createdAt: new Date(),
  });

  // Create milestones if provided
  if (type === "milestone" && goalData.milestones && Array.isArray(goalData.milestones)) {
    for (const milestoneData of goalData.milestones) {
      await Milestone.create({
        goalId: goal.id,
        title: milestoneData.title,
        done: milestoneData.done || false,
        doneAt: milestoneData.doneAt || null,
      });
    }
  }

  return {id: goal.id};
};

const updateGoal = async (userId, goalId, updates) => {
  // Remove milestones from updates if present (we'll handle them separately)
  const {milestones, ...goalUpdates} = updates;

  // Check if this is a milestone goal (either updating to milestone or already is one)
  const goal = await Goal.findOne({where: {id: goalId, userId}});
  const isMilestoneGoal = updates.type === "milestone" || goal?.type === "milestone";

  // Update the goal itself
  await Goal.update(goalUpdates, {where: {id: goalId, userId}});

  // Handle milestones if provided and this is a milestone goal
  if (isMilestoneGoal && milestones && Array.isArray(milestones)) {
    // Delete existing milestones for this goal
    await Milestone.destroy({where: {goalId}});

    // Create new milestones
    for (const milestoneData of milestones) {
      await Milestone.create({
        goalId,
        title: milestoneData.title,
        done: milestoneData.done || false,
        doneAt: milestoneData.doneAt || null,
      });
    }
  }
};

const deleteGoal = async (userId, goalId) => {
  // Cascade delete will handle entries and milestones
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

// Entry management functions
const createGoalEntry = async (userId, goalId, entryData) => {
  const entry = await GoalEntry.create({
    goalId,
    userId,
    occurredAt: entryData.occurred_at || new Date(),
    quantity: entryData.quantity || null,
  });
  return {id: entry.id, ...entry.toJSON()};
};

const getGoalEntries = async (userId, goalId, periodStart, periodEnd) => {
  const whereClause = {
    goalId,
    userId,
  };

  if (periodStart && periodEnd) {
    whereClause.occurredAt = {
      [Sequelize.Op.gte]: periodStart,
      [Sequelize.Op.lt]: periodEnd,
    };
  }

  const entries = await GoalEntry.findAll({
    where: whereClause,
    order: [["occurred_at", "DESC"]],
  });
  return entries.map((entry) => ({id: entry.id, ...entry.toJSON()}));
};

const updateGoalEntry = async (userId, entryId, updates) => {
  const entry = await GoalEntry.findOne({
    where: {id: entryId, userId},
  });
  if (!entry) {
    throw new Error("Entry not found");
  }
  await entry.update({
    occurredAt: updates.occurred_at || entry.occurredAt,
    quantity: updates.quantity !== undefined ? updates.quantity : entry.quantity,
  });
  return {id: entry.id, ...entry.toJSON()};
};

const deleteGoalEntry = async (userId, entryId) => {
  await GoalEntry.destroy({where: {id: entryId, userId}});
};

// Milestone management functions
const createMilestone = async (goalId, milestoneData) => {
  const milestone = await Milestone.create({
    goalId,
    title: milestoneData.title,
    done: milestoneData.done || false,
    doneAt: milestoneData.doneAt || null,
  });
  return {id: milestone.id, ...milestone.toJSON()};
};

const updateMilestone = async (milestoneId, updates) => {
  const milestone = await Milestone.findByPk(milestoneId);
  if (!milestone) {
    throw new Error("Milestone not found");
  }
  await milestone.update({
    title: updates.title || milestone.title,
    done: updates.done !== undefined ? updates.done : milestone.done,
    doneAt: updates.done ? (updates.doneAt || new Date()) : null,
  });
  return {id: milestone.id, ...milestone.toJSON()};
};

const getMilestones = async (goalId) => {
  const milestones = await Milestone.findAll({
    where: {goalId},
    order: [["id", "ASC"]],
  });
  return milestones.map((m) => ({id: m.id, ...m.toJSON()}));
};

const markMilestoneDone = async (milestoneId, done) => {
  const milestone = await Milestone.findByPk(milestoneId);
  if (!milestone) {
    throw new Error("Milestone not found");
  }
  await milestone.update({
    done,
    doneAt: done ? new Date() : null,
  });
  return {id: milestone.id, ...milestone.toJSON()};
};

// Evaluation logic functions
const getPeriodBoundaries = (cadence, timestamp = null) => {
  const now = timestamp || new Date();
  const utcNow = new Date(now.toISOString());

  let start; let end;

  switch (cadence) {
    case "day": {
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      break;
    }
    case "week": {
      // Week starts on Monday (ISO week)
      const dayOfWeek = utcNow.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(utcNow);
      monday.setUTCDate(utcNow.getUTCDate() - daysToMonday);
      start = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      break;
    }
    case "month": {
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));
      end = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth() + 1, 1));
      break;
    }
    case "quarter": {
      const quarter = Math.floor(utcNow.getUTCMonth() / 3);
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), quarter * 3, 1));
      end = new Date(Date.UTC(utcNow.getUTCFullYear(), (quarter + 1) * 3, 1));
      break;
    }
    default:
      throw new Error(`Invalid cadence: ${cadence}`);
  }

  return {start, end};
};

const evaluateGoal = async (userId, goalId, timestamp = null) => {
  const goal = await Goal.findOne({where: {id: goalId, userId}});
  if (!goal) {
    throw new Error("Goal not found");
  }

  const goalData = goal.toJSON();

  // For milestone and one-time goals, return their completion status
  if (goalData.type === "milestone") {
    const milestones = await getMilestones(goalId);
    const allDone = milestones.length > 0 && milestones.every((m) => m.done);
    return {
      completed: allDone,
      actual: milestones.filter((m) => m.done).length,
      target: milestones.length,
    };
  }

  if (goalData.type === "one_time") {
    return {
      completed: goalData.completed || false,
      actual: goalData.completed ? 1 : 0,
      target: 1,
    };
  }

  // For habit and metric goals, evaluate based on entries
  if (!goalData.cadence) {
    throw new Error("Goal must have cadence for evaluation");
  }

  const {start, end} = getPeriodBoundaries(goalData.cadence, timestamp);
  const entries = await getGoalEntries(userId, goalId, start, end);

  if (goalData.measure === "count") {
    const count = entries.length;
    return {
      completed: count >= goalData.targetCount,
      actual: count,
      target: goalData.targetCount,
    };
  } else if (goalData.measure === "sum") {
    const sum = entries.reduce((acc, entry) => {
      return acc + (parseFloat(entry.quantity) || 0);
    }, 0);
    return {
      completed: sum >= parseFloat(goalData.targetQuantity),
      actual: sum,
      target: parseFloat(goalData.targetQuantity),
      unit: goalData.unit,
    };
  }

  throw new Error(`Invalid measure: ${goalData.measure}`);
};

const getGoalProgress = async (userId, goalId) => {
  return evaluateGoal(userId, goalId);
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

  // Goal Entries
  createGoalEntry,
  getGoalEntries,
  updateGoalEntry,
  deleteGoalEntry,

  // Milestones
  createMilestone,
  updateMilestone,
  getMilestones,
  markMilestoneDone,

  // Evaluation
  getPeriodBoundaries,
  evaluateGoal,
  getGoalProgress,

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
