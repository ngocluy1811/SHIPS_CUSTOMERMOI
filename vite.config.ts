import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://ships-backendmoihehe-1.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '5ab9-14-191-68-176.ngrok-free.app',
      '01e5-14-191-68-96.ngrok-free.app',
      'ships-customermoi.onrender.com',
      'ships-admin.onrender.com',
      'ships-backendmoihehe-1.onrender.com'
    ],
  },
  preview: {
    port: 3000,
    host: true,
  },
})
