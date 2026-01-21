import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "imperia-logo.jpg", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "IMPERIA",
        short_name: "IMPERIA",
        description: "Sistema premium de registros operativos y checklists",
        theme_color: "#0b1220",
        background_color: "#0b1220",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable any" }
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        runtimeCaching: [
          // API: siempre online (network-first o network-only)
          {
            urlPattern: ({ url }) => url.pathname.includes("/api/"),
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
