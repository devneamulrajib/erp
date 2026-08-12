const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
  user: String,
  title: String,
  comment: String,
  attachments: [String],
}, { timestamps: true });
module.exports = mongoose.model('Comment', commentSchema);