/**
 * Basemap providers, in the order they are tried.
 *
 * Why this file exists: the dashboard used to draw tiles straight from the
 * OpenStreetMap Foundation's volunteer tile servers, through the long-deprecated
 * rotating-subdomain host form. Those servers enforce the OSMF Tile Usage Policy and
 * answer a request they do not like with a *200 OK* "403r Access blocked" PNG, so a
 * blocked map is indistinguishable from a working one to Leaflet — no `tileerror`
 * ever fires and the operator just sees "Access blocked" printed across the city.
 *
 * The fix is to stop depending on that service. Both vector providers below are
 * keyless, permit production use, serve `Access-Control-Allow-Origin: *`, and ask
 * only for attribution. The raster entry is a last resort for browsers without
 * WebGL; it is policy-compliant (canonical host, no `{s}` subdomains, Referer left
 * intact by the backend's `strict-origin-when-cross-origin` policy).
 *
 * Sources:
 *   https://operations.osmfoundation.org/policies/tiles/
 *   https://openfreemap.org/quick_start/
 *   https://versatiles.org/
 */
import type { Theme } from './theme';

export type VectorProvider = {
  readonly id: string;
  readonly kind: 'vector';
  readonly styles: Record<Theme, string>;
  readonly attribution: string;
};

export type RasterProvider = {
  readonly id: string;
  readonly kind: 'raster';
  readonly url: string;
  readonly maxZoom: number;
  readonly attribution: string;
};

export type BasemapProvider = VectorProvider | RasterProvider;

const PROBE_TIMEOUT_MS = 6000;

export const PROVIDERS: readonly BasemapProvider[] = [
  {
    id: 'openfreemap',
    kind: 'vector',
    styles: {
      light: 'https://tiles.openfreemap.org/styles/positron',
      dark: 'https://tiles.openfreemap.org/styles/fiord',
    },
    attribution:
      '<a href="https://openfreemap.org/">OpenFreeMap</a> · ' +
      '<a href="https://www.openmaptiles.org/">© OpenMapTiles</a> · ' +
      'Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    id: 'versatiles',
    kind: 'vector',
    styles: {
      light: 'https://tiles.versatiles.org/assets/styles/colorful/style.json',
      dark: 'https://tiles.versatiles.org/assets/styles/eclipse/style.json',
    },
    attribution:
      '<a href="https://versatiles.org/">VersaTiles</a> · ' +
      'Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    /* No-WebGL last resort only. Never the default: see the file header. */
    id: 'osm-raster',
    kind: 'raster',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
];

export function styleFor(provider: VectorProvider, theme: Theme): string {
  return provider.styles[theme];
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

/**
 * A provider counts as reachable only if its style document actually parses.
 * `response.ok` alone is not enough: a captive portal or an error page answers 200.
 */
export async function reachable(provider: VectorProvider, theme: Theme): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(styleFor(provider, theme), {
      signal: controller.signal,
      mode: 'cors',
    });
    if (!response.ok) return false;
    const style: unknown = await response.json();
    return (
      typeof style === 'object' &&
      style !== null &&
      (style as { version?: unknown }).version === 8 &&
      typeof (style as { sources?: unknown }).sources === 'object'
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** The first provider that can actually draw, or null if none can. */
export async function pickProvider(theme: Theme): Promise<BasemapProvider | null> {
  const webgl = hasWebGL();
  for (const provider of PROVIDERS) {
    if (provider.kind === 'raster') return provider;
    if (!webgl) continue;
    if (await reachable(provider, theme)) return provider;
  }
  return null;
}
