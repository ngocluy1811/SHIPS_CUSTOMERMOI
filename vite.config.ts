import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '5ab9-14-191-68-176.ngrok-free.app',
      '01e5-14-191-68-96.ngrok-free.app',
    ],
  },
})
