import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { devSave } from './vite-dev-save.js'

export default defineConfig({
  plugins: [svelte(), devSave()],
  // its own port, so it never collides with Noctilia (5180) or the Vite default (5173)
  server: { host: true, port: 5181, strictPort: true },
})
