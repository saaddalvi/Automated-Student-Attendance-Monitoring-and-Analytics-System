const { DataTypes, Model } = require('sequelize');

class AuditLog extends Model {}

const initAuditLogModel = (sequelize) => {
  AuditLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      actorId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      targetUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      ip: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '127.0.0.1',
      },
    },
    {
      sequelize,
      tableName: 'audit_logs',
      underscored: true,
      timestamps: true,
      updatedAt: false, // Append-only audit log
      indexes: [
        {
          fields: ['target_user_id'],
        },
        {
          fields: ['action'],
        },
        {
          fields: ['created_at'],
        },
      ],
    }
  );

  return AuditLog;
};

module.exports = { AuditLog, initAuditLogModel };
