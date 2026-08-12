const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: String,
  date: Date,
  status: String,
  comment: String,
  addedBy: String,
}, { _id: false });

const requirementSchema = new mongoose.Schema({
  priceRange: String,
  size: String,
  area: { type: mongoose.Schema.Types.ObjectId, ref: 'Area' },
  type: String,
  description: String,
}, { timestamps: true });

const dealNegotiationSchema = new mongoose.Schema({
  flat: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
  activityType: { type: String, default: 'Negotiation' },
  clientOfferPrice: { type: Number, default: 0 },
  listedPrice: { type: Number, default: 0 },
  finalPrice: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Countered'], default: 'Pending' },
  round: { type: Number, default: 1 },
  createdBy: String,
}, { timestamps: true });

const followUpSchema = new mongoose.Schema({
  followUpDate: Date,
  note: String,
  comment: String,
  assignUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignUserName: String,
  status: String,
}, { timestamps: true });

const visitSchema = new mongoose.Schema({
  date: Date,
  note: String,
  comment: String,
  assignUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignUserName: String,
  status: String,
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  note: String,
  addedBy: String,
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
  leadId: { type: String, unique: true },
  date: { type: Date, default: Date.now },

  name: { type: String, required: true },
  phoneCountryCode: { type: String, default: '+880' },
  mobile: { type: String, required: true },
  secondaryNumber: String,
  email: String,

  assignUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignUserName: String,
  crUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  crUserName: String,
  leadStage: String,

  leadSourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadSource' },
  interestedProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  leadCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadCategory' },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },

  organization: String,
  designation: String,
  birthDate: Date,
  anniversaryDate: Date,
  profession: String,
  address: String,

  srOfficer: String,
  cr: String,

  status: { type: String, default: 'New' },
  lastActivity: activitySchema,
  nextActivity: Date,
  activityLog: [activitySchema],

  // --- Detail modal tabs ---
  isJunk: { type: Boolean, default: false },
  isSold: { type: Boolean, default: false },
  possibility: String,

  requirements: [requirementSchema],
  dealNegotiations: [dealNegotiationSchema],
  assignedFlats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Flat' }],
  followUps: [followUpSchema],
  visits: [visitSchema],
  notes: [noteSchema],

  isConverted: { type: Boolean, default: false },
  convertedCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  addedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);