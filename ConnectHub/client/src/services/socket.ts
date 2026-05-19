import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '';

let socket: Socket | null = null;

export const connectSocket = (token: string) => {
  if (socket?.connected) return socket;

  socket = io(API_URL || '/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
