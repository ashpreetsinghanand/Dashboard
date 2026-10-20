import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The API runs separately (docker compose up); the client calls /api, which Vite forwards to it.
  server: { proxy: { '/api': 'http://127.0.0.1:8080' } },
})
