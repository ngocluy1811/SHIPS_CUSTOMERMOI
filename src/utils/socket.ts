import { io } from 'socket.io-client';

const SOCKET_URL = 'https://ships-backendmoihehe-1.onrender.com';

// Get token from localStorage
const token = localStorage.getItem('token');

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  auth: {
    token
  }
});

socket.on('connect', () => {
  console.log('Socket connected');
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});