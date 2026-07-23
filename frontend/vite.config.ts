import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/rrfashion/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'RR Fashion POS',
        short_name: 'RR Fashion',
        description: 'RR Fashion Point of Sale',
        theme_color: '#000000',
        icons: [
          { src: '/favicon.ico', sizes: '192x192', type: 'image/x-icon' },
        ],
        display: 'standalone',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['**/runtime-env.js'],
        runtimeCaching: [
          // Network-only for runtime-env.js — always fetch fresh API URL from server
          {
            urlPattern: /\/runtime-env\.js$/,
            handler: 'NetworkOnly',
          },
          // Stale-while-revalidate for app shell assets (JS, CSS, HTML)
          // CacheFirst can serve stale chunks after deployment, causing errors
          // StaleWhileRevalidate serves cached content immediately but fetches updates in the background
          {
            urlPattern: /\.(?:js|css|html)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-shell',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          // Network-first for real-time stock/inventory API
          {
            urlPattern: /^\/api\/inventory/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-inventory',
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
            },
          },
          // Stale-while-revalidate for product catalog
          {
            urlPattern: /^\/api\/products/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-products',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 60 },
            },
          },
          // Network-first for other API calls
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-calls',
              expiration: { maxEntries: 100, maxAgeSeconds: 5 * 60 },
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
