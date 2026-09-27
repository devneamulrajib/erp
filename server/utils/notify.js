const { Notification } = require('../models/associations');
const { getIO } = require('./socket');

async function notifyAdmin(type, message, relatedType, relatedId) {
  try {
    await Notification.create({ type, message, relatedType, relatedId, audience: 'admin' });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

// Notifies one supplier/vendor portal user via their ChartOfAccount id
// (this is what PurchaseOrder.supplierId points at), and pushes it live
// over the socket to that supplier's portal room if they're connected.
async function notifySupplier(supplierId, type, message, relatedType, relatedId) {
  try {
    const n = await Notification.create({
      type, message, relatedType, relatedId,
      audience: 'supplier',
      audienceId: supplierId,
    });
    const io = getIO();
    if (io) io.to(`supplier:${supplierId}`).emit('notification', n.toJSON());
  } catch (err) {
    console.error('Failed to create supplier notification:', err.message);
  }
}

// Same idea for a customer portal user.
async function notifyCustomer(customerId, type, message, relatedType, relatedId) {
  try {
    const n = await Notification.create({
      type, message, relatedType, relatedId,
      audience: 'customer',
      audienceId: customerId,
    });
    const io = getIO();
    if (io) io.to(`customer:${customerId}`).emit('notification', n.toJSON());
  } catch (err) {
    console.error('Failed to create customer notification:', err.message);
  }
}

module.exports = notifyAdmin;
module.exports.notifyAdmin = notifyAdmin;
module.exports.notifySupplier = notifySupplier;
module.exports.notifyCustomer = notifyCustomer;