const { DataTypes, Model } = require('sequelize');

class StudentClass extends Model {}

const initStudentClassModel = (sequelize) => {
  StudentClass.init(
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    },
    {
      sequelize,
      tableName: 'student_classes',
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['student_id', 'class_id'] },
      ],
    }
  );

  return StudentClass;
};

module.exports = { StudentClass, initStudentClassModel };
