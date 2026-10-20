const { DataTypes, Model } = require('sequelize');

class DeviceResetRequest extends Model {}

const initDeviceResetRequestModel = (sequelize) => {
  DeviceResetRequest.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      reasonCode: {
        type: DataTypes.ENUM('lost', 'replaced', 'factory_reset', 'other'),
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'expired', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      reviewedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      reviewNote: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      bindingExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'device_reset_requests',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          fields: ['student_id'],
        },
        {
          fields: ['status'],
        },
      ],
    }
  );

  return DeviceResetRequest;
};

module.exports = { DeviceResetRequest, initDeviceResetRequestModel };
