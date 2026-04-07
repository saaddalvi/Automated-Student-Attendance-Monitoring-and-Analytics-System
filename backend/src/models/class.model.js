const { DataTypes, Model } = require('sequelize');

class Class extends Model {}

const initClassModel = (sequelize) => {
  Class.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      className: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Class name cannot be empty.' },
        },
      },

      department: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Department cannot be empty.' },
        },
      },

      year: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Year cannot be empty.' },
        },
      },

      division: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Division cannot be empty.' },
        },
      },

      classCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Class code cannot be empty.' },
        },
      },

      teacherId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    },
    {
      sequelize,
      tableName: 'classes',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['class_code'] }],
    }
  );

  return Class;
};

module.exports = { Class, initClassModel };
