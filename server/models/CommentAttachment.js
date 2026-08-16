const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CommentAttachment = sequelize.define('CommentAttachment', {
  url: { type: DataTypes.STRING, allowNull: false },
}, { timestamps: false });

module.exports = CommentAttachment;