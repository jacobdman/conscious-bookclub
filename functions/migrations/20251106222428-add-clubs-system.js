/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper function to safely add column if it doesn't exist
    const addColumnIfNotExists = async (tableName, columnName, columnDefinition) => {
      const tableDescription = await queryInterface.describeTable(tableName);
      if (!tableDescription[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDefinition);
      }
    };

    // Helper function to add index if it doesn't exist
    const addIndexIfNotExists = async (tableName, indexName, fields) => {
      try {
        const indexes = await queryInterface.showIndex(tableName);
        const indexExists = indexes.some((idx) => idx.name === indexName);
        if (!indexExists) {
          await queryInterface.addIndex(tableName, fields, {name: indexName});
        }
      } catch (error) {
        // Table might not exist yet, that's okay
        if (!error.message.includes("does not exist")) {
          throw error;
        }
      }
    };

    // Create clubs table
    const clubsTableExists = await queryInterface.tableExists("clubs");
    if (!clubsTableExists) {
      await queryInterface.createTable("clubs", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        config: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: Sequelize.literal("'{}'::jsonb"),
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });
    }

    // Create club_members table
    const clubMembersTableExists = await queryInterface.tableExists("club_members");
    if (!clubMembersTableExists) {
      await queryInterface.createTable("club_members", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        club_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "clubs",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        user_id: {
          type: Sequelize.STRING(255),
          allowNull: false,
          references: {
            model: "users",
            key: "uid",
          },
          onDelete: "CASCADE",
        },
        role: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "member",
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });

      // Add unique constraint on (club_id, user_id)
      await queryInterface.addIndex("club_members", ["club_id", "user_id"], {
        unique: true,
        name: "club_members_club_user_unique",
      });
    }

    // Add club_id columns to existing tables
    await addColumnIfNotExists("books", "club_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Temporarily nullable for migration
      references: {
        model: "clubs",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    await addColumnIfNotExists("goals", "club_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Temporarily nullable for migration
      references: {
        model: "clubs",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    await addColumnIfNotExists("meetings", "club_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Temporarily nullable for migration
      references: {
        model: "clubs",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    await addColumnIfNotExists("posts", "club_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Temporarily nullable for migration
      references: {
        model: "clubs",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    // Create indexes
    await addIndexIfNotExists("club_members", "idx_club_members_club_id", ["club_id"]);
    await addIndexIfNotExists("club_members", "idx_club_members_user_id", ["user_id"]);
    await addIndexIfNotExists("books", "idx_books_club_id", ["club_id"]);
    await addIndexIfNotExists("goals", "idx_goals_club_id", ["club_id"]);
    await addIndexIfNotExists("meetings", "idx_meetings_club_id", ["club_id"]);
    await addIndexIfNotExists("posts", "idx_posts_club_id", ["club_id"]);

    // Migrate existing data to default club
    // Check if default club already exists (in case migration partially ran)
    let defaultClubResults = await queryInterface.sequelize.query(
        `SELECT id FROM clubs WHERE name = 'Main Club' LIMIT 1`,
        {type: Sequelize.QueryTypes.SELECT},
    );

    let defaultClubId;
    if (defaultClubResults && defaultClubResults.length > 0) {
      // Default club already exists
      defaultClubId = defaultClubResults[0].id;
    } else {
      // Create default "Main Club" with the old Google Calendar ID in config
      const oldCalendarId = '99d5640c339ece5cf6b5abb26854d93f2cf4b8fc4b87e4a5aa0ca6bb4bc49020@group.calendar.google.com';
      const configJson = JSON.stringify({ googleCalendarId: oldCalendarId }).replace(/'/g, "''");
      defaultClubResults = await queryInterface.sequelize.query(
          `INSERT INTO clubs (name, config, created_at) 
           VALUES ('Main Club', '${configJson}'::jsonb, CURRENT_TIMESTAMP) 
           RETURNING id`,
          {type: Sequelize.QueryTypes.SELECT},
      );
      if (defaultClubResults && defaultClubResults.length > 0) {
        defaultClubId = defaultClubResults[0].id;
      }
    }

    if (defaultClubId) {

      // Assign all existing data to default club using raw SQL
      await queryInterface.sequelize.query(
          `UPDATE books SET club_id = ${defaultClubId} WHERE club_id IS NULL`,
      );
      await queryInterface.sequelize.query(
          `UPDATE goals SET club_id = ${defaultClubId} WHERE club_id IS NULL`,
      );
      await queryInterface.sequelize.query(
          `UPDATE meetings SET club_id = ${defaultClubId} WHERE club_id IS NULL`,
      );
      await queryInterface.sequelize.query(
          `UPDATE posts SET club_id = ${defaultClubId} WHERE club_id IS NULL`,
      );

      // Verify all rows were updated (check for any remaining NULLs)
      const [booksNull] = await queryInterface.sequelize.query(
          `SELECT COUNT(*) as count FROM books WHERE club_id IS NULL`,
          {type: Sequelize.QueryTypes.SELECT},
      );
      const [goalsNull] = await queryInterface.sequelize.query(
          `SELECT COUNT(*) as count FROM goals WHERE club_id IS NULL`,
          {type: Sequelize.QueryTypes.SELECT},
      );
      const [meetingsNull] = await queryInterface.sequelize.query(
          `SELECT COUNT(*) as count FROM meetings WHERE club_id IS NULL`,
          {type: Sequelize.QueryTypes.SELECT},
      );
      const [postsNull] = await queryInterface.sequelize.query(
          `SELECT COUNT(*) as count FROM posts WHERE club_id IS NULL`,
          {type: Sequelize.QueryTypes.SELECT},
      );

      if (parseInt(booksNull.count) > 0 || parseInt(goalsNull.count) > 0 ||
          parseInt(meetingsNull.count) > 0 || parseInt(postsNull.count) > 0) {
        throw new Error(
            `Migration failed: Some rows still have NULL club_id. ` +
            `Books: ${booksNull.count}, Goals: ${goalsNull.count}, ` +
            `Meetings: ${meetingsNull.count}, Posts: ${postsNull.count}`,
        );
      }

      // Add all existing users to default club
      // First user becomes owner, rest become members
      const users = await queryInterface.sequelize.query(
          `SELECT uid FROM users ORDER BY created_at ASC`,
          {type: Sequelize.QueryTypes.SELECT},
      );

      if (users && users.length > 0) {
        // First user is owner - escape single quotes in user ID
        const firstUserId = users[0].uid.replace(/'/g, "''");
        await queryInterface.sequelize.query(
            `INSERT INTO club_members (club_id, user_id, role, created_at) 
             VALUES (${defaultClubId}, '${firstUserId}', 'owner', CURRENT_TIMESTAMP)
             ON CONFLICT (club_id, user_id) DO NOTHING`,
        );

        // Rest are members
        for (let i = 1; i < users.length; i++) {
          const userId = users[i].uid.replace(/'/g, "''");
          await queryInterface.sequelize.query(
              `INSERT INTO club_members (club_id, user_id, role, created_at) 
               VALUES (${defaultClubId}, '${userId}', 'member', CURRENT_TIMESTAMP)
               ON CONFLICT (club_id, user_id) DO NOTHING`,
          );
        }
      }
    }

    // Now make club_id NOT NULL after migration
    await queryInterface.changeColumn("books", "club_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "clubs",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    await queryInterface.changeColumn("goals", "club_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "clubs",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    await queryInterface.changeColumn("meetings", "club_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "clubs",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    await queryInterface.changeColumn("posts", "club_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "clubs",
        key: "id",
      },
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    try {
      await queryInterface.removeIndex("posts", "idx_posts_club_id");
      await queryInterface.removeIndex("meetings", "idx_meetings_club_id");
      await queryInterface.removeIndex("goals", "idx_goals_club_id");
      await queryInterface.removeIndex("books", "idx_books_club_id");
      await queryInterface.removeIndex("club_members", "idx_club_members_user_id");
      await queryInterface.removeIndex("club_members", "idx_club_members_club_id");
    } catch (error) {
      // Indexes might not exist
    }

    // Remove club_id columns
    try {
      await queryInterface.removeColumn("posts", "club_id");
      await queryInterface.removeColumn("meetings", "club_id");
      await queryInterface.removeColumn("goals", "club_id");
      await queryInterface.removeColumn("books", "club_id");
    } catch (error) {
      // Columns might not exist
    }

    // Drop club_members table
    try {
      await queryInterface.dropTable("club_members");
    } catch (error) {
      // Table might not exist
    }

    // Drop clubs table
    try {
      await queryInterface.dropTable("clubs");
    } catch (error) {
      // Table might not exist
    }
  },
};

