import { io } from 'socket.io-client';

const ERP_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = ERP_BASE.replace(/\/api\/?$/, '');

let socket = null;

export function getPortalSocket() {
  if (socket) return socket;
  const token = localStorage.getItem('portalToken');
  if (!token) return null;
  socket = io(SOCKET_URL, {
    auth: { token },
  });
  return socket;
}

export function disconnectPortalSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}