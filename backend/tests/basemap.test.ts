/**
 * Regression guard for the "403r Access blocked" tile outage and for the two ways
 * the replacement basemap can fail *silently* in a production build.
 *
 * All four are pinned because each one alone leaves an operator staring at a map
 * that is blank or covered in "Access blocked", with nothing in the console.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const read = (relative: string): string => readFileSync(resolve(root, relative), 'utf8');

const securityMiddleware = read('backend/middleware/security.ts');
const basemap = read('frontend/src/basemap.ts');
const basemapGl = read('frontend/src/basemap-gl.ts');
const basemapLayer = read('frontend/src/components/BasemapLayer.tsx');
const mapDashboard = read('frontend/src/components/MapDashboard.tsx');
const indexHtml = read('frontend/index.html');

describe('basemap resilience', () => {
  it('keeps a Referrer-Policy that lets tile servers see where requests come from', () => {
    expect(securityMiddleware).toMatch(/policy:\s*'strict-origin-when-cross-origin'/);
    expect(securityMiddleware).not.toMatch(/policy:\s*'no-referrer'/);
  });

  it('never uses the deprecated {s}.tile.openstreetmap.org subdomain form', () => {
    for (const source of [basemap, basemapLayer, mapDashboard]) {
      expect(source).not.toMatch(/\{s\}\.tile\.openstreetmap\.org/);
    }
  });

  it('draws the map through the failover-aware layer, not a hardcoded TileLayer', () => {
    expect(mapDashboard).toMatch(/<BasemapLayer \/>/);
    expect(mapDashboard).not.toMatch(/<TileLayer/);
  });

  it('prefers keyless providers and keeps OSM raster as a last resort only', () => {
    const ids = [...basemap.matchAll(/id:\s*'([a-z-]+)'/g)].map((m) => m[1]);
    expect(ids).toEqual(['openfreemap', 'versatiles', 'osm-raster']);
  });

  it('allows every configured basemap host in the production CSP', () => {
    const hosts = [...basemap.matchAll(/https:\/\/(tiles\.[a-z.]+)\//g)].map((m) => m[1]);
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of new Set(hosts)) {
      expect(securityMiddleware).toContain(`https://${host}`);
    }
  });

  it('allows the MapLibre worker in the production CSP', () => {
    // Without `worker-src blob:` the renderer never starts and the map stays blank.
    expect(securityMiddleware).toMatch(/workerSrc:\s*\["'self'", 'blob:'\]/);
  });

  it('gives MapLibre an explicit worker URL', () => {
    // MapLibre v6 resolves its worker at runtime, so no bundler emits it; without
    // this the worker 404s, dies on the SPA fallback HTML, and the map never loads
    // a single tile — with no error anywhere. See frontend/src/basemap-gl.ts.
    expect(basemapGl).toMatch(/setWorkerUrl\(/);
    expect(basemapGl).toMatch(/maplibre-gl-worker\.mjs\?worker&url/);
  });

  it('loads map stylesheets from the bundle, not from a CDN the CSP blocks', () => {
    expect(indexHtml).not.toMatch(/<link[^>]*unpkg\.com/);
  });
});
