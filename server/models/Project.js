const mongoose = require('mongoose');
const projectSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: 'ON TRACK' }, // ON TRACK / DELAYED / DONE
  percentComplete: { type: Number, default: 0 },
  budget: { type: Number, default: 0 },
  budgetUsed: { type: Number, default: 0 },
  months: { type: Number, default: 0 },
  members: { type: Number, default: 0 },
  totalTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model('Project', projectSchema);