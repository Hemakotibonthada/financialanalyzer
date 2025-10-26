import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'mui-icons': ['@mui/icons-material'],
          'charts': ['chart.js', 'react-chartjs-2', 'recharts'],
          'utils': ['axios', 'date-fns', 'lodash']
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    // Source maps for debugging (disable in production)
    sourcemap: false
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces for mobile access
    port: 3000,
    // Proxy disabled - using direct API calls with VITE_API_URL from .env
    // This allows access from any device on the same network
  }
})
