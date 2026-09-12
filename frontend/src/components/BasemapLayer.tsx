/**
 * The map background, with provider failover.
 *
 * Replaces the plain `<TileLayer>` that pointed at the OpenStreetMap Foundation's
 * volunteer tile servers; see `../basemap.ts` for why that had to go. The first
 * reachable provider is chosen once on mount, then the style follows the UI theme.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { pickProvider, styleFor, type BasemapProvider } from '../basemap';
import { currentTheme, useThemeVersion } from '../theme';

export default function BasemapLayer(): JSX.Element | null {
  const map = useMap();
  /* Follow the document's theme. `useTheme()` would hand back a private copy of the
     state that only the component owning the toggle ever updates. */
  const themeVersion = useThemeVersion();
  const theme = useMemo(() => currentTheme(), [themeVersion]);
  const [provider, setProvider] = useState<BasemapProvider | null>(null);
  const layerRef = useRef<L.MaplibreGL | null>(null);
  const appliedStyle = useRef<string | null>(null);

  /* Probe once. The theme at mount only decides which style URL is probed; a later
     theme change swaps the style on the layer that is already attached. */
  const themeAtMount = useRef(theme);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const chosen = await pickProvider(themeAtMount.current);
      /* MapLibre GL is ~600 kB, so it is pulled in only once a vector provider has
         actually won the probe — a raster or no-WebGL visitor never downloads it. */
      if (chosen?.kind === 'vector') await import('../basemap-gl');
      if (!cancelled) setProvider(chosen);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (provider?.kind !== 'vector') return undefined;
    const style = styleFor(provider, theme);
    const layer = L.maplibreGL({
      style,
      /* Credit our own literal string rather than whatever HTML the style document
         carries. It keeps the required attribution correct even if a provider ships a
         blank one, and it keeps third-party markup out of MapLibre's sanitizer — the
         attack surface of GHSA-jrc7-96c5-q579. */
      attributionControl: { customAttribution: provider.attribution },
    });
    layerRef.current = layer;
    appliedStyle.current = style;
    layer.addTo(map);
    return () => {
      layerRef.current = null;
      appliedStyle.current = null;
      map.removeLayer(layer);
    };
    /* `theme` is deliberately absent: a theme change swaps the style in place below
       rather than tearing the whole GL context down and rebuilding it. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, provider]);

  useEffect(() => {
    if (provider?.kind !== 'vector') return;
    const style = styleFor(provider, theme);
    /* Skip the run that follows mounting: the layer already loaded this style, and
       re-setting it would drop the attribution the bridge adds on `load`. */
    if (appliedStyle.current === style) return;
    try {
      layerRef.current?.getMaplibreMap().setStyle(style);
      appliedStyle.current = style;
    } catch {
      /* A style swap is cosmetic; a failure must not take the map down. */
    }
  }, [provider, theme]);

  if (provider?.kind === 'raster') {
    return (
      <TileLayer
        url={provider.url}
        maxZoom={provider.maxZoom}
        attribution={provider.attribution}
        /* Required by the OSMF tile policy: the Referer header must reach the server. */
        referrerPolicy="strict-origin-when-cross-origin"
        crossOrigin="anonymous"
      />
    );
  }
  return null;
}
