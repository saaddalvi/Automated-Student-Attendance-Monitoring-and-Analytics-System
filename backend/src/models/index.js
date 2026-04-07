const { sequelize } = require('../config/database');
const { User, initUserModel } = require('./user.model');
const { Attendance, initAttendanceModel } = require('./attendance.model');
const { Session, initSessionModel } = require('./session.model');
const { SessionToken, initSessionTokenModel } = require('./sessionToken.model');
const { Class, initClassModel } = require('./class.model');
const { StudentClass, initStudentClassModel } = require('./studentClass.model');

// ─── Initialize Models ────────────────────────────────────────────────────────
initUserModel(sequelize);
initAttendanceModel(sequelize);
initSessionModel(sequelize);
initSessionTokenModel(sequelize);
initClassModel(sequelize);
initStudentClassModel(sequelize);

// ─── Associations ─────────────────────────────────────────────────────────────

// User ↔ Attendance
User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Session ↔ Attendance
Session.hasMany(Attendance, { foreignKey: 'sessionId', as: 'attendances' });
Attendance.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

// Class ↔ Attendance
Class.hasMany(Attendance, { foreignKey: 'classId', as: 'attendances' });
Attendance.belongsTo(Class, { foreignKey: 'classId', as: 'class' });

// User ↔ Session (creator)
User.hasMany(Session, { foreignKey: 'createdBy', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Class ↔ Session
Class.hasMany(Session, { foreignKey: 'classId', as: 'sessions' });
Session.belongsTo(Class, { foreignKey: 'classId', as: 'class' });

// Session ↔ SessionToken
Session.hasMany(SessionToken, { foreignKey: 'sessionId', as: 'tokens' });
SessionToken.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

// User ↔ Class (teacher)
User.hasMany(Class, { foreignKey: 'teacherId', as: 'classes' });
Class.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

// Many-to-many: Students ↔ Classes via StudentClass
User.belongsToMany(Class, { through: StudentClass, foreignKey: 'studentId', as: 'enrolledClasses' });
Class.belongsToMany(User, { through: StudentClass, foreignKey: 'classId', as: 'students' });

// Direct access to the join table
User.hasMany(StudentClass, { foreignKey: 'studentId', as: 'enrollments' });
StudentClass.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Class.hasMany(StudentClass, { foreignKey: 'classId', as: 'enrollments' });
StudentClass.belongsTo(Class, { foreignKey: 'classId', as: 'class' });

// ─── DB Object ────────────────────────────────────────────────────────────────
const db = {
  sequelize,
  User,
  Attendance,
  Session,
  SessionToken,
  Class,
  StudentClass,
};

module.exports = db;
