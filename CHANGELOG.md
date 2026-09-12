# Changelog

All notable changes to this project are documented here, following
[Keep a Changelog](https://keepachangelog.com/) and [SemVer](https://semver.org/).

## [Unreleased]

### Fixed
- The map no longer risks OpenStreetMap's "Access blocked" tiles: the dashboard used
  the long-deprecated `{s}.tile.openstreetmap.org` rotating-subdomain host. A refusal
  from those servers arrives as *200 OK* carrying a "blocked" image, so Leaflet never
  raised `tileerror` and the failure was invisible to the app.
- Leaflet's and leaflet-draw's stylesheets were linked from a CDN that the production
  CSP (`style-src 'self'`) blocked, so a production build rendered the map unstyled.
  They are imported from their npm packages now.

### Changed
- Basemap tiles now come from keyless vector providers with automatic failover —
  OpenFreeMap, then VersaTiles, then OSM raster only if the browser has no WebGL.
  See `frontend/src/basemap.ts`.
- The production CSP allows the basemap hosts in `connect-src` and MapLibre's worker
  in `worker-src`; `frontend/src/basemap-gl.ts` gives MapLibre an explicit worker URL,
  without which the bundled worker 404s and the map stays blank with no error.
- MapLibre GL (~600 kB) is loaded lazily, only once a vector provider is selected.

### Added
- `GET /healthz` (liveness) and `GET /readyz` (readiness, reports mock/live mode).
- End-to-end test suite (Vitest + supertest) covering every REST endpoint in mock
  mode, validation errors, and the `x-correlator` guard (`npm test`).
- CI workflow, Dependabot, and governance files (SECURITY, CODE_OF_CONDUCT, CONTRIBUTING).
- `engines.node >= 20.17` to document the runtime requirement.

### Changed
- Express app extracted to `backend/app.ts` (exported); `backend/server.ts` only
  starts the listener. Runtime behavior and the entry point are unchanged.

### Security
- `npm audit fix` applied — 0 known vulnerabilities (no breaking upgrades).
