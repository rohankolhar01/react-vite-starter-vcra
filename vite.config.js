import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const BACKEND = process.env.VITE_BACKEND_URL || 'https://test-50044291949.development.catalystappsail.in'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
