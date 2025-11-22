import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
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
      },
      onwarn(warning, warn) {
        // Suppress certain warnings for cleaner build output
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging (production CDN can strip)
        drop_debugger: true,
        pure_funcs: ['console.debug'] // Remove only console.debug
      }
    },
    // Source maps for debugging (disable in production)
    sourcemap: false,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces for mobile access
    port: 3000,
    // Proxy disabled - using direct API calls with VITE_API_URL from .env
    // This allows access from any device on the same network
  }
})
