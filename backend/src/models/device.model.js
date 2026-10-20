const { DataTypes, Model } = require('sequelize');

class Device extends Model {}

const initDeviceModel = (sequelize) => {
  Device.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      deviceHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      label: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Unknown Device',
      },
      signalsJson: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      status: {
        type: DataTypes.ENUM('active', 'revoked'),
        allowNull: false,
        defaultValue: 'active',
      },
      boundAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      hasWebAuthn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      webauthnCredentialId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      webauthnPublicKey: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      webauthnCounter: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      webauthnTransports: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      sequelize,
      tableName: 'devices',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id'],
          where: {
            status: 'active',
          },
        },
        {
          unique: true,
          fields: ['device_hash'],
          where: {
            status: 'active',
          },
        },
      ],
    }
  );

  return Device;
};

module.exports = { Device, initDeviceModel };
