import { io } from 'socket.io-client';
import { API_ORIGIN } from '../../config';
import { getItem } from '../../storage/tokenStore';

let socket = null;

export function getPortalSocket() {
  if (socket) return socket;
  const token = getItem('portalToken');
  if (!token) return null;
  socket = io(API_ORIGIN, { auth: { token }, transports: ['websocket'] });
  return socket;
}

export function disconnectPortalSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
