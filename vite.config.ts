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
      injectRegister: "auto",
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
          // Cache FMI XML.
          {
            urlPattern: ({ url }) => url.origin === "https://opendata.fmi.fi",
            handler: "NetworkFirst",
            options: {
              cacheName: "fmi-wfs",
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
