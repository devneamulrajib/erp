const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function init(server) {
  io = new Server(server, {
    cors: { origin: '*' },
  });

  // Same portal-token shape middleware/portalAuth.js already verifies:
  // { portal: true, customerId, role }. Passed via the socket handshake
  // instead of an Authorization header.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded.portal || !decoded.customerId || !decoded.role) {
        return next(new Error('Invalid portal token'));
      }
      socket.portalUser = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { customerId, role } = socket.portalUser;

    // Customers and suppliers/vendors keep their existing rooms. Any other
    // role (e.g. 'employee') gets its own namespace, so ids from different
    // tables can never share a room.
    let audience;
    if (role === 'customer') audience = 'customer';
    else if (role === 'supplier' || role === 'vendor') audience = 'supplier';
    else audience = role;

    socket.join(`${audience}:${customerId}`);
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { init, getIO };