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
  // Dev più veloce: pre-bundle esplicito dei moduli pesanti alla prima
  // apertura (evita la scoperta incrementale una dipendenza alla volta).
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'framer-motion',
      'date-fns',
      'date-fns/locale',
      'lucide-react',
      'convex/react',
      'recharts',
      '@google/genai',
    ],
  },
  build: {
    // Pagine lazy (React.lazy) → un chunk per tab + vendor separati.
    // Forma funzionale: matching deterministico sui path risolti.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Code-splitting: cache parallela e long-term dei vendor
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/recharts/')) return 'charts';
          if (id.includes('/framer-motion/')) return 'motion';
          if (id.includes('/@google/genai/')) return 'genai';
          if (id.includes('/convex/')) return 'convex';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) {
            return 'react-vendor';
          }
          return 'vendor';
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
