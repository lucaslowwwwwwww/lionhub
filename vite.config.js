import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
      },
      manifest: {
        name: '传承龙狮体育会',
        short_name: '传承',
        description: 'Professional performance management for Chuan Cheng Lion Dance.',
        start_url: '/',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#e11d48',
        scope: '/',
        icons: [
          {
            src: '/chuan_cheng_logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/chuan_cheng_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 2000,
    // Strip ALL console statements and debugger from production builds
    esbuild: {
      drop: ['console', 'debugger'],
    },
  }
})
