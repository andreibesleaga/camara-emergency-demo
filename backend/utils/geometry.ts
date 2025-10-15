import { Polygon, Point, PointList, AreaType } from '../models/camara-common';

/**
 * Legacy polygon type for backward compatibility
 * @deprecated Use CAMARA Polygon instead
 */
interface LegacyPolygon {
  coordinates: [number, number][];
}

/**
 * Ensure a CAMARA Polygon boundary is closed (first and last points are the same)
 */
export function ensureClosedPolygon(polygon: Polygon): Polygon {
  const boundary = polygon.boundary;
  if (boundary.length > 0) {
    const first = boundary[0];
    const last = boundary[boundary.length - 1];
    if (first.latitude !== last.latitude || first.longitude !== last.longitude) {
      return {
        ...polygon,
        boundary: [...boundary, first],
      };
    }
  }
  return polygon;
}

/**
 * Convert legacy polygon format to CAMARA Polygon
 * Legacy format: { coordinates: [[lon, lat], ...] }
 * CAMARA format: { areaType: 'POLYGON', boundary: [{latitude, longitude}, ...] }
 */
export function legacyPolygonToCamara(legacy: LegacyPolygon): Polygon {
  return {
    areaType: AreaType.POLYGON,
    boundary: legacy.coordinates.map(([lon, lat]) => ({
      latitude: lat,
      longitude: lon,
    })),
  };
}

/**
 * Convert CAMARA Polygon to legacy format
 * For backward compatibility with existing code
 */
export function camaraPolygonToLegacy(polygon: Polygon): LegacyPolygon {
  return {
    coordinates: polygon.boundary.map((point) => [point.longitude, point.latitude]),
  };
}

/**
 * Create a CAMARA Point from lat/lon values
 */
export function createPoint(latitude: number, longitude: number): Point {
  return { latitude, longitude };
}

/**
 * Create a simple rectangular CAMARA Polygon from bounds
 */
export function createRectangle(minLat: number, minLon: number, maxLat: number, maxLon: number): Polygon {
  return {
    areaType: AreaType.POLYGON,
    boundary: [
      { latitude: minLat, longitude: minLon },
      { latitude: minLat, longitude: maxLon },
      { latitude: maxLat, longitude: maxLon },
      { latitude: maxLat, longitude: minLon },
      { latitude: minLat, longitude: minLon }, // Close the polygon
    ],
  };
}
