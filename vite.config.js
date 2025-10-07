import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
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
        grades: './gradepad/grades.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  define: {
    // Enable environment variables for client-side
    __VUE_PROD_DEVTOOLS__: false
  }
})
