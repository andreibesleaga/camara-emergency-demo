import { Polygon } from '../models/types';

export function ensureClosedPolygon(polygon: Polygon): Polygon {
  const coords = polygon.coordinates;
  if (coords.length > 0) {
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return { coordinates: [...coords, first] };
    }
  }
  return polygon;
}