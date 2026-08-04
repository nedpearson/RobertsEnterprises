import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/html2canvas')) return 'vendor-canvas';
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/file-saver') || id.includes('node_modules/exceljs')) return 'vendor-export';
          if (id.includes('node_modules/docx')) return 'vendor-docx';
          if (id.includes('node_modules/dompurify')) return 'vendor-purify';
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

