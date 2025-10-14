import { DeviceLocation, DensitySnapshot, FlowSeries, Polygon, AlertEvent, RoutePlan, LatLng } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import * as turf from '@turf/turf';
import { ensureClosedPolygon } from '../utils/geometry';

function rnd(min: number, max: number) { return Math.random() * (max - min) + min; }

export function mockDeviceLocation(deviceId: string): DeviceLocation {
  const baseLat = 44.4268 + rnd(-0.02, 0.02);
  const baseLon = 26.1025 + rnd(-0.03, 0.03);
  return {
    deviceId,
    location: { lat: baseLat, lon: baseLon },
    accuracyMeters: Math.round(rnd(10, 200)),
    timestamp: new Date().toISOString(),
    source: Math.random() > 0.6 ? 'network' : 'gps'
  };
}

export function mockDensitySnapshot(areaId: string, polygon: Polygon): DensitySnapshot {
  const safePoly = ensureClosedPolygon(polygon);
  const bbox = turf.bbox(turf.polygon([safePoly.coordinates]));
  const [minX, minY, maxX, maxY] = bbox;
  const points: { lat: number; lon: number; count: number }[] = [];
  const totalPoints = 200;
  let totalDevices = 0;
  for (let i = 0; i < totalPoints; i++) {
    const lon = rnd(minX, maxX);
    const lat = rnd(minY, maxY);
    const count = Math.round(rnd(1, 50) * (Math.random() > 0.5 ? rnd(1, 3) : 1));
    totalDevices += count;
    points.push({ lat, lon, count });
  }
  return { areaId, timestamp: new Date().toISOString(), totalDevices, points };
}

export function mockFlowSeries(areaId: string): FlowSeries {
  const intervalMinutes = 15;
  const segments = 24;
  const series = [];
  let base = Math.round(rnd(1000, 5000));
  for (let i = 0; i < segments; i++) {
    const t = new Date(Date.now() - (segments - i) * intervalMinutes * 60000).toISOString();
    base = Math.max(500, base + Math.round(rnd(-400, 400)));
    series.push({ timestamp: t, totalDevices: base });
  }
  return { areaId, intervalMinutes, series };
}

export function mockAlert(ruleId: string, totalDevices: number, threshold: number): AlertEvent {
  const level = totalDevices > threshold * 1.5 ? 'critical' : totalDevices > threshold ? 'warning' : 'info';
  const message = level === 'critical'
    ? 'Critical density exceeded. Immediate action recommended.'
    : level === 'warning'
      ? 'High density detected. Monitor and prepare resources.'
      : 'Density within normal range.';
  return { ruleId, triggeredAt: new Date().toISOString(), totalDevices, level, message };
}

export function mockRoute(from: LatLng, to: LatLng): RoutePlan {
  const segments = 10;
  const path: LatLng[] = [];
  for (let i = 0; i <= segments; i++) {
    const lat = from.lat + (to.lat - from.lat) * (i / segments) + rnd(-0.0008, 0.0008);
    const lon = from.lon + (to.lon - from.lon) * (i / segments) + rnd(-0.0008, 0.0008);
    path.push({ lat, lon });
  }
  const distanceKm = (turf.length(turf.lineString(path.map(p => [p.lon, p.lat])), { units: 'kilometers' }) as number);
  const congestionFactor = rnd(0.8, 1.6);
  const speedKmH = 30 / congestionFactor;
  const etaMinutes = Math.round((distanceKm / speedKmH) * 60);
  const advisories = congestionFactor > 1.3 ? ['Avoid main boulevard due to crowding'] : ['Route clear'];
  return { from, to, path, etaMinutes, advisories };
}
