require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    hooks: {
      // Your database's tables are all lowercase (from the original import),
      // but Sequelize's default naming keeps capital letters (e.g. "Users").
      // This rule lowercases the table name automatically for any model
      // that doesn't already have its own custom tableName set.
      beforeDefine: (attributes, options) => {
        if (!options.tableName) {
          const base = Sequelize.Utils.pluralize(options.modelName);
          options.tableName = base.toLowerCase();
        }
      },
    },
  }
);

module.exports = sequelize;