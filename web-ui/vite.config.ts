import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
  ],
  // Resolve wasm-pack output from rust-core
  resolve: {
    alias: {
      'sort-forge-core': path.resolve(__dirname, '../rust-core/pkg'),
    },
  },
  // Allow serving wasm files from rust-core/pkg
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, '.'),
        path.resolve(__dirname, '../rust-core/pkg'),
      ],
    },
  },
})
