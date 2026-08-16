const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Lead = sequelize.define('Lead', {
  leadId: { type: DataTypes.STRING, unique: true },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  name: { type: DataTypes.STRING, allowNull: false },
  phoneCountryCode: { type: DataTypes.STRING, defaultValue: '+880' },
  mobile: { type: DataTypes.STRING, allowNull: false },
  secondaryNumber: DataTypes.STRING,
  email: DataTypes.STRING,
  assignUserId: DataTypes.INTEGER,
  assignUserName: DataTypes.STRING,
  crUserId: DataTypes.INTEGER,
  crUserName: DataTypes.STRING,
  leadStage: DataTypes.STRING,
  leadSourceId: DataTypes.INTEGER,
  interestedProjectId: DataTypes.INTEGER,
  leadCategoryId: DataTypes.INTEGER,
  campaignId: DataTypes.INTEGER,
  organization: DataTypes.STRING,
  designation: DataTypes.STRING,
  birthDate: DataTypes.DATE,
  anniversaryDate: DataTypes.DATE,
  profession: DataTypes.STRING,
  address: DataTypes.STRING,
  srOfficer: DataTypes.STRING,
  cr: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'New' },

  // lastActivity was a single embedded subdoc in Mongoose — flattened here
  lastActivityType: DataTypes.STRING,
  lastActivityDate: DataTypes.DATE,
  lastActivityStatus: DataTypes.STRING,
  lastActivityComment: DataTypes.STRING,
  lastActivityAddedBy: DataTypes.STRING,

  nextActivity: DataTypes.DATE,
  isJunk: { type: DataTypes.BOOLEAN, defaultValue: false },
  isSold: { type: DataTypes.BOOLEAN, defaultValue: false },
  possibility: DataTypes.STRING,
  isConverted: { type: DataTypes.BOOLEAN, defaultValue: false },
  convertedCustomerId: DataTypes.INTEGER,
  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = Lead;