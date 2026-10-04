const ActivityLog = require('../models/ActivityLog');

// Fire-and-forget: never let logging failure break the real operation.
async function logActivity({ module: mod, action, message, amount, budgetCategoryId, relatedType, relatedId, performedBy }) {
  try {
    await ActivityLog.create({
      module: mod, action, message,
      amount: amount ?? null,
      budgetCategoryId: budgetCategoryId ?? null,
      relatedType: relatedType ?? null,
      relatedId: relatedId ?? null,
      performedBy: performedBy || 'Admin',
    });
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
}

module.exports = logActivity;