const { Sequelize } = require('sequelize');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables.');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully (Neon DB).');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
  }
};

module.exports = { sequelize, testConnection };
