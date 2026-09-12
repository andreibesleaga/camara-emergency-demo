/**
 * MapLibre GL setup for the bundled build. Imported dynamically by `BasemapLayer`,
 * so the ~600 kB engine is fetched only once a vector provider has won the probe.
 *
 * The worker URL has to be set explicitly. MapLibre GL v6 resolves its worker at
 * runtime with `new URL('./maplibre-gl-worker.mjs', import.meta.url)`, which no
 * bundler can see, so the worker chunk is never emitted; the browser then asks the
 * dev/static server for a file that does not exist, gets the SPA fallback HTML back,
 * and the module worker dies on a syntax error. MapLibre reports nothing: the style
 * and sprites load on the main thread, tile loading lives in the worker, and the map
 * just stays blank forever. Vite's `?worker&url` emits a properly bundled worker
 * (its own imports resolved) and hands back its URL.
 */
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-leaflet';

setWorkerUrl(maplibreWorkerUrl);
