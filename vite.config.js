import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '5ab9-14-191-68-176.ngrok-free.app' ,
      'ships-customermoi.onrender.com',// Thay bằng domain ngrok hiện tại của bạn
      'ships-admin.onrender.com',
      'ships-backendmoihehe-1.onrender.com'
    ],
    host: true,
    port: 5173,
  },
}); 