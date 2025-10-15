/**
 * Application-specific types for CAMARA Emergency Demo
 * 
 * This file extends CAMARA common types with demo-specific data structures.
 * Standard CAMARA types (Device, PhoneNumber, Point, Polygon, etc.) are
 * imported from camara-common.ts which implements CAMARA_common.yaml spec.
 * 
 * Reference: https://github.com/camaraproject/Commonalities/blob/main/artifacts/CAMARA_common.yaml
 */

import { Point, Polygon, Device, PhoneNumber } from './camara-common';

// Re-export CAMARA common types for convenience
export { Point, Polygon, Device, PhoneNumber, AreaType, Circle, Area } from './camara-common';

/**
 * Legacy LatLng type - kept for backward compatibility with existing code
 * @deprecated Use CAMARA Point type instead
 */
export type LatLng = { lat: number; lon: number };

/**
 * Device location information including accuracy and source
 */
export interface DeviceLocation {
  /** Device identifier (phone number or other identifier) */
  deviceId: string;
  /** Location coordinates */
  location: LatLng;
  /** Accuracy in meters */
  accuracyMeters: number;
  /** Timestamp in ISO 8601 format */
  timestamp: string;
  /** Source of the location data */
  source: 'network' | 'gps';
}

/**
 * Density point with device count
 */
export interface DensityPoint {
  lat: number;
  lon: number;
  count: number;
}

/**
 * Population density snapshot for an area
 */
export interface DensitySnapshot {
  areaId: string;
  timestamp: string;
  totalDevices: number;
  points: DensityPoint[];
}

/**
 * Time series of device counts for flow analysis
 */
export interface FlowSeries {
  areaId: string;
  intervalMinutes: number;
  series: Array<{
    timestamp: string;
    totalDevices: number;
  }>;
}

/**
 * Geofence rule for triggering alerts
 */
export interface GeofenceRule {
  id: string;
  name: string;
  polygon: Polygon;
  thresholdDevices: number;
  alertChannels: Array<'ui' | 'webhook'>;
  webhookUrl?: string;
  active: boolean;
}

/**
 * Alert event triggered by geofence rule
 */
export interface AlertEvent {
  ruleId: string;
  triggeredAt: string;
  totalDevices: number;
  level: 'info' | 'warning' | 'critical';
  message: string;
}

/**
 * Route planning result
 */
export interface RoutePlan {
  from: LatLng;
  to: LatLng;
  waypoints?: LatLng[];
  path: LatLng[];
  etaMinutes: number;
  advisories: string[];
}

/**
 * Helper: Convert CAMARA Point to legacy LatLng
 */
export function pointToLatLng(point: Point): LatLng {
  return {
    lat: point.latitude,
    lon: point.longitude,
  };
}

/**
 * Helper: Convert legacy LatLng to CAMARA Point
 */
export function latLngToPoint(latLng: LatLng): Point {
  return {
    latitude: latLng.lat,
    longitude: latLng.lon,
  };
}
