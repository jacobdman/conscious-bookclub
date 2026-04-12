/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const MeetingRsvp = sequelize.define(
      "MeetingRsvp",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        meetingId: {
          type: DataTypes.INTEGER,
          field: "meeting_id",
          allowNull: false,
        },
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
      },
      {
        tableName: "meeting_rsvps",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
  );

  MeetingRsvp.associate = (models) => {
    MeetingRsvp.belongsTo(models.Meeting, {
      foreignKey: "meeting_id",
      as: "meeting",
    });
    MeetingRsvp.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return MeetingRsvp;
};
