import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'app1 — Gestione Personale',
        short_name: 'app1',
        description: 'Scuola, Sport, Routine, Alimentazione e Finanza',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        id: '/',
        categories: ['productivity', 'education', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*convex\.cloud\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'convex-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Code-splitting: cache parallela e long-term dei vendor
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          convex: ['convex'],
          gemini: ['@google/genai'],
        },
      },
    },
  },
  server: {
    host: true, // bind 0.0.0.0 — necessario per il preview
    port: 5173,
    allowedHosts: true,
  },
});
