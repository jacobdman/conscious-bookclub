/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add parent_post_id and parent_post_text to posts table
    await queryInterface.addColumn("posts", "parent_post_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "posts",
        key: "id",
      },
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("posts", "parent_post_text", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("posts", "parent_author_name", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // Remove reaction_counts column
    await queryInterface.removeColumn("posts", "reaction_counts");

    // Create post_reactions table
    await queryInterface.createTable("post_reactions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      post_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "posts",
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
      emoji: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("posts", ["club_id"], {
      name: "posts_club_id_idx",
    });
    await queryInterface.addIndex("posts", ["parent_post_id"], {
      name: "posts_parent_post_id_idx",
    });
    await queryInterface.addIndex("posts", ["created_at"], {
      name: "posts_created_at_idx",
    });
    await queryInterface.addIndex("post_reactions", ["post_id"], {
      name: "post_reactions_post_id_idx",
    });
    await queryInterface.addIndex("post_reactions", ["user_id"], {
      name: "post_reactions_user_id_idx",
    });

    // Add unique constraint on (post_id, user_id, emoji)
    await queryInterface.addIndex(
        "post_reactions",
        ["post_id", "user_id", "emoji"],
        {
          unique: true,
          name: "post_reactions_unique",
        },
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex("posts", "posts_club_id_idx");
    await queryInterface.removeIndex("posts", "posts_parent_post_id_idx");
    await queryInterface.removeIndex("posts", "posts_created_at_idx");
    await queryInterface.removeIndex("post_reactions", "post_reactions_post_id_idx");
    await queryInterface.removeIndex("post_reactions", "post_reactions_user_id_idx");
    await queryInterface.removeIndex("post_reactions", "post_reactions_unique");

    // Drop post_reactions table
    await queryInterface.dropTable("post_reactions");

    // Restore reaction_counts column
    await queryInterface.addColumn("posts", "reaction_counts", {
      type: Sequelize.JSONB,
      defaultValue: {thumbsUp: 0, thumbsDown: 0, heart: 0, laugh: 0},
    });

    // Remove parent_post_id, parent_post_text, and parent_author_name
    await queryInterface.removeColumn("posts", "parent_author_name");
    await queryInterface.removeColumn("posts", "parent_post_text");
    await queryInterface.removeColumn("posts", "parent_post_id");
  },
};

