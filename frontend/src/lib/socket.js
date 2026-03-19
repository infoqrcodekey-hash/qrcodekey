// ============================================
// lib/socket.js - Socket.io Client
// ============================================
// WebSocket connection for real-time updates

import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket = null;

// ====== Connect ======
export const connectSocket = () => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('🔌 Socket error:', err.message);
  });

  return socket;
};

// ====== Get Socket Instance ======
export const getSocket = () => {
  if (!socket) return connectSocket();
  return socket;
};

// ====== Disconnect ======
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ====== Join User Room (Personal Notifications) ======
export const joinUserRoom = (userId) => {
  const s = getSocket();
  s.emit('join_user', userId);
};

// ====== Join QR Tracking Room ======
export const joinQRTracking = (qrId) => {
  const s = getSocket();
  s.emit('join_qr_tracking', qrId);
};

// ====== Leave QR Tracking Room ======
export const leaveQRTracking = (qrId) => {
  const s = getSocket();
  s.emit('leave_qr_tracking', qrId);
};

// ====== Listen for Events ======
export const onScanAlert = (callback) => {
  const s = getSocket();
  s.on('qr_scanned', callback);
  return () => s.off('qr_scanned', callback);
};

export const onNewScan = (callback) => {
  const s = getSocket();
  s.on('new_scan', callback);
  return () => s.off('new_scan', callback);
};

export const onLiveLocation = (callback) => {
  const s = getSocket();
  s.on('live_location', callback);
  return () => s.off('live_location', callback);
};
