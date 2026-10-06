// server/utils/notify.js
const { Notification, User } = require('../models/associations');
const { getIO } = require('./socket');

// Notifies Admins (audience = 'admin') and emits live over socket
async function notifyAdmin(type, message, relatedType, relatedId) {
  try {
    const n = await Notification.create({
      type,
      message,
      relatedType,
      relatedId,
      audience: 'admin',
    });
    const io = getIO();
    if (io) {
      io.to('admin').emit('notification', n.toJSON());
      io.emit('admin_notification', n.toJSON());
    }
    return n;
  } catch (err) {
    console.error('Failed to create admin notification:', err.message);
  }
}

// Notifies Accountants (audience = 'accountant' or scoped to specific user if accountantUserId is given)
async function notifyAccountant(accountantUserId, type, message, relatedType, relatedId) {
  try {
    const n = await Notification.create({
      type,
      message,
      relatedType,
      relatedId,
      audience: 'accountant',
      audienceId: accountantUserId || null,
    });
    const io = getIO();
    if (io) {
      if (accountantUserId) {
        io.to(`user:${accountantUserId}`).emit('notification', n.toJSON());
      }
      io.to('accountant').emit('notification', n.toJSON());
      io.emit('accountant_notification', n.toJSON());
    }
    return n;
  } catch (err) {
    console.error('Failed to create accountant notification:', err.message);
  }
}

// Notifies one supplier/vendor portal user
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

// Same idea for a customer portal user
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

// Notifies one employee portal user
async function notifyEmployee(employeeId, type, message, relatedType, relatedId) {
  try {
    const n = await Notification.create({
      type, message, relatedType, relatedId,
      audience: 'employee',
      audienceId: employeeId,
    });
    const io = getIO();
    if (io) io.to(`employee:${employeeId}`).emit('notification', n.toJSON());
  } catch (err) {
    console.error('Failed to create employee notification:', err.message);
  }
}

module.exports = notifyAdmin;
module.exports.notifyAdmin = notifyAdmin;
module.exports.notifyAccountant = notifyAccountant;
module.exports.notifySupplier = notifySupplier;
module.exports.notifyCustomer = notifyCustomer;
module.exports.notifyEmployee = notifyEmployee;