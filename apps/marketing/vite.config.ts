import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/rest/v1/') && (url.hostname.includes('supabase.co') || url.hostname.includes('127.0.0.1')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'NetworkOnly',
          }
        ],
        importScripts: ['/service-worker-push.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5000000,
        navigateFallbackDenylist: [/^\/$/],
      },
      manifest: {
        name: "VowOS Retailer Mobile",
        short_name: "Roberts Mobile",
        description: "Mobile operations, scheduling, appointments, customers, sales, inventory, and business management for VowOS Retailer.",
        id: "/",
        start_url: "/app",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui", "browser"],
        orientation: "any",
        theme_color: "#1c1917",
        background_color: "#fafaf9",
        prefer_related_applications: false,
        categories: ["business", "productivity", "finance"],
        icons: [
          {
            src: "/icons/favicon-16x16.png",
            sizes: "16x16",
            type: "image/png"
          },
          {
            src: "/icons/favicon-32x32.png",
            sizes: "32x32",
            type: "image/png"
          },
          {
            src: "/icons/pwa-48x48.png",
            sizes: "48x48",
            type: "image/png"
          },
          {
            src: "/icons/pwa-72x72.png",
            sizes: "72x72",
            type: "image/png"
          },
          {
            src: "/icons/pwa-96x96.png",
            sizes: "96x96",
            type: "image/png"
          },
          {
            src: "/icons/pwa-128x128.png",
            sizes: "128x128",
            type: "image/png"
          },
          {
            src: "/icons/pwa-144x144.png",
            sizes: "144x144",
            type: "image/png"
          },
          {
            src: "/icons/pwa-152x152.png",
            sizes: "152x152",
            type: "image/png"
          },
          {
            src: "/icons/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png"
          },
          {
            src: "/icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/pwa-384x384.png",
            sizes: "384x384",
            type: "image/png"
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/pwa-192x192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/icons/pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        shortcuts: [
          { name: "Today", url: "/today", description: "View today's operations command center" },
          { name: "Calendar & Scheduling", url: "/schedule", description: "View calendar, workforce, and booking requests" },
          { name: "Action Center", url: "/actions", description: "View important notifications and tasks" },
          { name: "Customers", url: "/brides", description: "Manage client profiles and bridal details" },
          { name: "Sales", url: "/sales", description: "Track transactions, payments, and revenue" }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@vowos/design-system": path.resolve(__dirname, "../../packages/design-system/src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const chunks: Record<string, string[]> = {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "lucide-react",
            ],
            "vendor-charts": ["recharts"],
            "vendor-stripe": ["@stripe/react-stripe-js", "@stripe/stripe-js"],
            "vendor-supabase": ["@supabase/supabase-js"],
          };

          for (const [chunkName, packages] of Object.entries(chunks)) {
            if (packages.some((packageName) => id.includes(`/node_modules/${packageName}/`))) {
              return chunkName;
            }
          }

          return undefined;
        },
      },
    },
  },
}));
