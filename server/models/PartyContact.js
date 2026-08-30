const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PartyContact = sequelize.define('PartyContact', {
  name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  nid: DataTypes.STRING,
  position: DataTypes.STRING,
  address: DataTypes.TEXT,
  agreementId: DataTypes.INTEGER,
  type: DataTypes.STRING,     // 'First Party' / 'Second Party'
  status: DataTypes.STRING,   // 'Active' / 'Inactive'
  details: DataTypes.TEXT,
  image: DataTypes.STRING,    // stored filename
}, {
  tableName: 'party_list_entries',
  timestamps: true,
});

module.exports = PartyContact;