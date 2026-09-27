// ==========================================
// Section 1: Module Imports
// ==========================================
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ==========================================
// Section 2: Vite Configuration Definition
// ==========================================
export default defineConfig({
  plugins: [react()],

// ==========================================
// Section 3: Server and Resolve Settings
// ==========================================
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api/ai': {
        target: 'http://127.0.0.1:5001/demo-kims-diary/us-central1/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, ''),
      },
    },
  },
});
