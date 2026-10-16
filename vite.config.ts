import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The admin is a single-page app: it talks to the API from the browser and is
// served as static files (see Dockerfile). SPA mode prerenders the HTML shell.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: { port: 3001 },
  preview: { port: 3001 },
  plugins: [tailwindcss(), tanstackStart({ spa: { enabled: true } }), viteReact()],
})

export default config
