import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  root: './',
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './gradepad/index.html',
        grades: './gradepad/grades.html',
        features: './gradepad/features.html'
      }
    }
  },
  server: {
    port: 3003, // Use a different port to avoid conflicts
    open: '/gradepad/index.html',
    host: true
  },
  define: {
    // Enable environment variables for client-side
    __VUE_PROD_DEVTOOLS__: false
  }
})