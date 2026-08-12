const mongoose = require('mongoose');

const depreciationEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  reference: { type: String, default: '' },
  depreciation: { type: Number, default: 0 },
  cumulativeDepreciation: { type: Number, default: 0 },
  depreciableValue: { type: Number, default: 0 },
  journalEntry: { type: String, default: '' },
}, { _id: true });

const movementEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  from: { type: String, default: '' },
  to: { type: String, default: '' },
}, { _id: true });

const revaluationEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  oldValue: { type: Number, default: 0 },
  newValue: { type: Number, default: 0 },
  change: { type: Number, default: 0 },
  note: { type: String, default: '' },
}, { _id: true });

const assetSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    location: { type: String, default: '' },
    originalValue: { type: Number, required: true, default: 0 },
    acquisitionDate: { type: Date, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

    method: { type: String, enum: ['Straight Line', 'Declining Balance', 'Double Declining Balance'], default: 'Straight Line' },
    duration: { type: Number, default: 0 },
    durationUnit: { type: String, default: 'Year' },
    computation: { type: String, enum: ['Monthly', 'Yearly'], default: 'Yearly' },

    notDepreciableValue: { type: Number, default: 0 },
    bookValue: { type: Number, default: 0 },
    depreciableValue: { type: Number, default: 0 },

    expenseAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccount' },
    voucherNo: { type: String, default: '' },

    status: { type: String, enum: ['Running', 'Disposed', 'Fully Depreciated'], default: 'Running' },

    depreciationEntries: [depreciationEntrySchema],
    movementEntries: [movementEntrySchema],
    revaluationEntries: [revaluationEntrySchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Asset', assetSchema);