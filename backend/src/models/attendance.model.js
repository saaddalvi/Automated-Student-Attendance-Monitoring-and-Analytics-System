const { DataTypes, Model } = require('sequelize');

class Attendance extends Model {}

const initAttendanceModel = (sequelize) => {
  Attendance.init(
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      sessionId: {
        type: DataTypes.UUID,
        allowNull: true, // nullable for backward compat (teacher manual marking)
        references: {
          model: 'sessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      classId: {
        type: DataTypes.UUID,
        allowNull: true, // nullable for backward compat
        references: {
          model: 'classes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      lecture: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        validate: {
          isDate: { msg: 'Date must be a valid date.', args: true },
        },
      },

      status: {
        type: DataTypes.ENUM('present', 'absent', 'late'),
        allowNull: false,
        defaultValue: 'absent',
      },
    },
    {
      sequelize,
      tableName: 'attendances',
      underscored: true,
      timestamps: true,

      hooks: {
        beforeValidate: (attendance) => {
          if (attendance.date) {
            attendance.date = new Date(attendance.date)
              .toISOString()
              .split('T')[0];
          }
        },
      },

      defaultScope: {
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      },

      indexes: [
        {
          name: 'attendance_user_date_idx',
          fields: ['user_id', 'date'],
        },
        {
          name: 'attendance_user_session_idx',
          unique: true,
          fields: ['user_id', 'session_id'],
        },
        {
          name: 'attendance_class_user_idx',
          fields: ['class_id', 'user_id'],
        },
        {
          name: 'attendance_session_idx',
          fields: ['session_id'],
        },
      ],
    }
  );

  return Attendance;
};

module.exports = { Attendance, initAttendanceModel };
