import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  // its own port, so it never collides with Noctilia (5180) or the Vite default (5173)
  server: { host: true, port: 5181, strictPort: true },
})
