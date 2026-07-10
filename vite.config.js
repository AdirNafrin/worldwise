import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Generates the service worker + web app manifest that make the app
    // installable and usable offline.
    VitePWA({
      // Auto-updates the service worker in the background on new deploys
      // instead of requiring the user to manually refresh twice.
      registerType: 'autoUpdate',
      // Non-hashed static assets referenced outside the JS/CSS bundle that
      // still need to be precached for offline use.
      includeAssets: ['favicon.svg', 'flags/*.svg'],
      manifest: {
        name: 'WorldWise',
        short_name: 'WorldWise',
        description: 'Trivia game about the countries of the world',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        // Makes an installed icon launch full-screen with no browser
        // chrome, like a native app, instead of opening a normal tab.
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // "maskable" lets Android crop this into whatever icon shape
          // the device theme uses, without important content getting cut off.
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        // Raised from Workbox's small default so the couple-hundred flag
        // SVGs + countries.json still get precached for offline play.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
})
