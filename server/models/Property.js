const mongoose = require('mongoose');
const propertySchema = new mongoose.Schema({
  name: String,
  project: String,
  sold: { type: Boolean, default: false },
});
module.exports = mongoose.model('Property', propertySchema);