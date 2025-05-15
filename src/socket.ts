import { io } from 'socket.io-client';
export const socket = io('wss://ships-backendmoihehe-1.onrender.com', { transports: ['websocket'] });
// hoặc
// export const socket = io('https://ships-backendmoihehe-1.onrender.com', { transports: ['websocket'] });