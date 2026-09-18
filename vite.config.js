import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/pdf-forge/',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    watch: {
      // Backend writes usage/data JSON during requests — ignore it or every
      // write triggers a full-page reload (infinite refresh loop).
      ignored: ['**/backend/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5100',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
