# Tieliikenne Video Wall

A Vite + React + Tailwind app that builds a full-screen video wall from Finnish Digitraffic traffic cameras.

Features
- Full-screen responsive grid of camera tiles
- Red "live" dot for images posted within the last hour
- Default cities: Vantaa, Espoo, Helsinki (selectable)
- 30+ Finnish cities available with expandable city selector
- Customizable reload intervals via URL parameters
- Optional top menu (shown by default, can be hidden)
- URL query param to override cities: `?cities=vantaa,espoo,helsinki`
- Automatic refresh: periodic and forced image refresh (cache-buster)
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

URL Parameters:
- `cities` - Comma-separated list of cities to display (e.g., `?cities=helsinki,tampere,turku`)
- `reload` - Reload interval in minutes (default: 5) - how often to refresh camera data
- `forceReload` - Force reload interval in minutes (default: 30) - force cache-busting refresh
- `showMenu` - Show/hide the top menu (default: true, use `?showMenu=false` to hide)

Available Cities:
- **Default cities**: Helsinki, Espoo, Vantaa
- The app includes 30+ Finnish cities with traffic cameras. Click the "+ More" button in the UI to see and select from the full list.
- The complete list is maintained in `src/lib/api.ts` as `availableCities`.
- You can also enter any city name in the text input field. The app will search for cameras in that area.

Usage Examples:
```
# Display cameras from Tampere and Turku only
?cities=tampere,turku

# Display all default cities with 10-minute reload interval
?reload=10

# Display Helsinki cameras, refresh every 2 minutes, force reload every 15 minutes
?cities=helsinki&reload=2&forceReload=15

# Display Oulu cameras without the top menu (full-screen mode)
?cities=oulu&showMenu=false

# Combine all parameters for custom setup
?cities=tampere,turku,oulu&reload=3&forceReload=20&showMenu=true
```

Additional Configuration:
- Default cities are found in `src/lib/api.ts` as `defaultCities`.
- Available cities list is in `src/lib/api.ts` as `availableCities`.
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
- Reload intervals:
  - Regular reload: refreshes camera data at the specified interval (default: 5 minutes, configurable via `reload` param).
  - Force reload: forces a cache-busting refresh at the specified interval (default: 30 minutes, configurable via `forceReload` param).
  - A timer in the header displays the time until next force reload.
- Menu visibility: The top menu can be hidden using `?showMenu=false` for a full-screen camera wall experience.

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

Live demo
- https://krugou.github.io/tieliikennevideowall/

GitHub Pages notes
- The Vite base is set to `/tieliikennevideowall/` for production builds to work on GitHub Pages.
- A `postbuild` step copies `dist/index.html` to `dist/404.html` to enable SPA-style routing fallback.
- GitHub Actions workflow is configured to build and deploy `dist/` to GitHub Pages automatically on push to `main`.

