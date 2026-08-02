import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/rrfashion/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'RR Fashion POS',
        short_name: 'RR Fashion',
        description: 'RR Fashion Point of Sale',
        theme_color: '#000000',
        icons: [
          { src: '/rrfashion/favicon.svg', sizes: '192x192', type: 'image/svg+xml' },
        ],
        display: 'standalone',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['**/runtime-env.js'],
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/rrfashion/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Network-only for runtime-env.js — always fetch fresh API URL from server
          {
            urlPattern: /\/runtime-env\.js$/,
            handler: 'NetworkOnly',
          },
          // NetworkFirst for index.html — always try network first, fall back to cache
          {
            urlPattern: /\/rrfashion\/index\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              expiration: { maxEntries: 1, maxAgeSeconds: 2 * 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
          // Stale-while-revalidate for JS/CSS assets
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          // Network-first for real-time stock/inventory API
          {
            urlPattern: /\/api\/inventory/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-inventory',
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
            },
          },
          // Stale-while-revalidate for product catalog
          {
            urlPattern: /\/api\/products/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-products',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 60 },
            },
          },
          // REQ-SEC-FE-005 / SEC-17: only PUBLIC catalog endpoints are cached.
          // User-specific payloads (/api/cart, /api/wishlist, /api/orders,
          // /api/auth, /api/profile, /api/guest, /api/admin*) are NEVER cached —
          // the previous generic `/^\/api\//` catch-all was a gap that could
          // serve one user's data to another from the SW cache.
          {
            urlPattern: /\/api\/(categories|brands|colors|sizes|stores|sale)\/?(?:$|\?)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-catalog',
              expiration: { maxEntries: 100, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
