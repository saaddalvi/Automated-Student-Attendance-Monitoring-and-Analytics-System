const { DataTypes, Model } = require('sequelize');

class Session extends Model {}

const initSessionModel = (sequelize) => {
  Session.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      classId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'classes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      lecture: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: { args: [10], msg: 'Duration must be at least 10 seconds.' },
        },
      },

      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      tableName: 'sessions',
      underscored: true,
      timestamps: true,
    }
  );

  return Session;
};

module.exports = { Session, initSessionModel };
