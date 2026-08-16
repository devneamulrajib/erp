const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Comment = sequelize.define('Comment', {
  user: DataTypes.STRING,
  title: DataTypes.STRING,
  comment: DataTypes.TEXT,
}, { timestamps: true });

module.exports = Comment;