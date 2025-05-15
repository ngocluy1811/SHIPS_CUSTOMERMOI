import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      '5ab9-14-191-68-176.ngrok-free.app' // Thay bằng domain ngrok hiện tại của bạn
    ],
    host: true,
    port: 5173,
  },
}); 