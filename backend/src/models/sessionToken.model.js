const { DataTypes, Model } = require('sequelize');

class SessionToken extends Model {}

const initSessionTokenModel = (sequelize) => {
  SessionToken.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      sessionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'sessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      token: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },

      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      isValid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      tableName: 'session_tokens',
      underscored: true,
      timestamps: true,

      indexes: [
        { fields: ['session_id'] },
        { fields: ['token'] },
        { fields: ['session_id', 'is_valid'] },
      ],
    }
  );

  return SessionToken;
};

module.exports = { SessionToken, initSessionTokenModel };
