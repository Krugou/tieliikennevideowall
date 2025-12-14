import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  // Development server uses '/', production builds use the repository path for GitHub Pages.
  base: mode === "development" ? "/" : "/tieliikennevideowall/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["favicon.svg", "robots.txt"],
      manifest: {
        name: "Tieliikenne Video Wall",
        short_name: "VideoWall",
        description:
          "Traffic camera video wall using Finnish Digitraffic weather cameras",
        theme_color: "#0b1220",
        background_color: "#000000",
        display: "standalone",
        scope: mode === "development" ? "/" : "/tieliikennevideowall/",
        start_url: mode === "development" ? "/" : "/tieliikennevideowall/",
        icons: [
          {
            src: "pwa-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "pwa-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback:
          mode === "development" ? "/" : "/tieliikennevideowall/index.html",
        runtimeCaching: [
          // Always try to fetch the latest app shell when online.
          // (Important for standalone PWA installs where users expect updates.)
          {
            urlPattern: ({ request, url }) => {
              if (request.mode !== "navigate") return false;

              // GitHub Pages: most in-app navigations stay at the base path with query params.
              // Also accept /index.html and client-side routes that may resolve via 404.html.
              const p = url.pathname;
              return (
                p === "/" ||
                p === "/index.html" ||
                p.startsWith("/tieliikennevideowall/")
              );
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "app-shell",
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200, 404] },
            },
          },
          // Cache camera images with a short TTL.
          {
            urlPattern: ({ url }) =>
              url.origin === "https://weathercam.digitraffic.fi" ||
              url.hostname === "weathercam.digitraffic.fi",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "digitraffic-weathercam-images",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 10 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cache Digitraffic API JSON.
          {
            urlPattern: ({ url }) =>
              url.origin === "https://tie.digitraffic.fi",
            handler: "NetworkFirst",
            options: {
              cacheName: "digitraffic-api",
              networkTimeoutSeconds: 6,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 5 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cache Yr/MET Norway JSON.
          {
            urlPattern: ({ url }) => url.origin === "https://api.met.no",
            handler: "NetworkFirst",
            options: {
              cacheName: "yr-locationforecast",
              networkTimeoutSeconds: 6,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 10 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cache Open-Meteo JSON (fallback provider).
          {
            urlPattern: ({ url }) =>
              url.origin === "https://api.open-meteo.com",
            handler: "NetworkFirst",
            options: {
              cacheName: "open-meteo",
              networkTimeoutSeconds: 6,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 10 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],

  // Strip console/debugger from production bundles.
  esbuild:
    mode === "development" ? undefined : { drop: ["console", "debugger"] },
}));
