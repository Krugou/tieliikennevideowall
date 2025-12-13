# Tieliikenne Video Wall

A Vite + React + Tailwind app that builds a full-screen video wall from Finnish Digitraffic traffic cameras.

Features
- Full-screen responsive grid of camera tiles
- Red "live" dot for images posted within the last hour
- Default cities: Vantaa, Espoo, Helsinki (selectable)
- URL query param to override cities: `?cities=vantaa,espoo,helsinki`
- Automatic refresh: periodic and forced 30-minute image refresh (cache-buster)
- Robust API handling: local caching, concurrency limits, 429 backoff and retry
- Dev-friendly: ESLint, Prettier, Husky, lint-staged

Quickstart
1. Requirements: Node 18+
2. Install:
   npm ci
3. Dev:
   npm run dev
4. Build:
   npm run build
5. Preview production build:
   npm run preview
6. Format and lint:
   npm run format
   npm run lint

Configuration
- Choose cities via UI or URL param `cities` (comma-separated).
- Default cities are found in `src/lib/api.ts` as `defaultCities`.
- Browser logs appear in dev mode (controlled by Vite's `import.meta.env.DEV`).

Deployment
- Builds are compatible with GitHub Pages (vite base set to `./`).
- CI workflow (GitHub Actions) builds and deploys `dist/` to GitHub Pages (.github/workflows/deploy.yml).
- To deploy locally: `npm run build` and then copy `dist/` to a static host.

Implementation notes
- Image URL constructed from preset id: `https://weathercam.digitraffic.fi/{presetId}.jpg`.
- API safety:
  - Local storage cache with short TTL.
  - Concurrency-limited detail/history fetches.
  - 429 responses trigger exponential backoff and a retry button in the UI.
- Forced refresh: the app schedules a one-shot forced refresh 30 minutes after a successful load. A small timer displays the next reload.

Troubleshooting
- 429 Too Many Requests: the app backs off automatically; use "Retry now" in the UI to manually retry.
- If images are stale, toggle "Show labels" or use the Refresh button to force reload.
- Inspect dev logs for `[api/*]` messages when running in dev mode.

Contributing
- Follow ESLint and Prettier rules. Husky + lint-staged will auto-format on commit.
- Add tests and components under `src/` and run linters before opening PRs.

License
- MIT

Useful links
- Digitraffic Weathercam API: https://www.digitraffic.fi/en/developers/

