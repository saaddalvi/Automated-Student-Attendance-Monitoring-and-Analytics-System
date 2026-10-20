const { Op } = require('sequelize');
const db = require('../models');
const { hashDeviceId, logAuditEvent } = require('./deviceSecurity');

/**
 * Migrates existing users with legacy User.deviceId into the Device table.
 * Idempotent: Skips users who already have an active Device record.
 */
async function migrateLegacyDevices() {
  try {
    const { User, Device } = db;
    const legacyUsers = await User.findAll({
      where: {
        deviceId: { [Op.ne]: null },
      },
    });

    for (const user of legacyUsers) {
      if (!user.deviceId) continue;
      const existing = await Device.findOne({
        where: { userId: user.id, status: 'active' },
      });
      if (!existing) {
        const hash = hashDeviceId(user.deviceId);
        await Device.create({
          userId: user.id,
          deviceHash: hash,
          label: 'Legacy Migrated Device',
          signalsJson: { migratedFrom: 'User.deviceId' },
          status: 'active',
          boundAt: user.updatedAt || new Date(),
          lastSeenAt: user.updatedAt || new Date(),
        });
        await logAuditEvent({
          actorId: null,
          targetUserId: user.id,
          action: 'DEVICE_BOUND',
          metadata: { note: 'Migrated from legacy User.deviceId' },
          ip: '127.0.0.1',
        });
      }
    }
  } catch (err) {
    console.error('migrateLegacyDevices error:', err.message);
  }
}

module.exports = { migrateLegacyDevices };
