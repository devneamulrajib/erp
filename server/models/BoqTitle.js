const mongoose = require('mongoose');

const boqTitleSchema = new mongoose.Schema(
  {
    projectType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectType', required: true },
    title: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('BoqTitle', boqTitleSchema);