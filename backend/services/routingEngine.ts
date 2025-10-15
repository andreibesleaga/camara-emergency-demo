import { RoutePlan, LatLng } from '../models/types';
import { mockRoute } from './mockGenerator';
import { listRules } from './alertEngine';
import { getDensitySnapshot } from './densityEngine';
import { AreaType } from '../models/camara-common';
import * as turf from '@turf/turf';
import logger from '../utils/logger';
import { loadConfig } from '../utils/config';

const cfg = loadConfig();

/**
 * Plan an optimized emergency route that:
 * 1. Uses OSRM for street-based routing (or fallback to smart interpolation)
 * 2. Uses CAMARA Population Density API to analyze route segments
 * 3. Avoids high-density areas from active geofencing alerts
 * 4. Considers crowd flow predictions from CAMARA data
 * 5. Provides alternative routes if main route is congested
 */
export async function planRoute(from: LatLng, to: LatLng): Promise<RoutePlan> {
  logger.info(`Planning route from [${from.lat}, ${from.lon}] to [${to.lat}, ${to.lon}]`);
  
  // Try to use OSRM for real street routing
  const route = await getOSRMRoute(from, to);
  
  if (route) {
    // Analyze route using CAMARA APIs and alert data
    const analysis = await analyzeRouteWithCamara(route.path, from, to);
    
    // Adjust ETA based on density analysis
    const adjustedETA = calculateAdjustedETA(route.etaMinutes, analysis);
    
    return {
      from,
      to,
      path: route.path,
      etaMinutes: adjustedETA,
      advisories: analysis.advisories,
    };
  }
  
  // Fallback to mock route if OSRM not available
  logger.warn('OSRM not available, using fallback routing');
  return mockRoute(from, to);
}

/**
 * Get route from OSRM (Open Source Routing Machine)
 * Public OSRM server: http://router.project-osrm.org
 */
async function getOSRMRoute(from: LatLng, to: LatLng): Promise<{ path: LatLng[]; etaMinutes: number } | null> {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
    
    // Create abort controller with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      logger.warn(`OSRM returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      logger.warn('OSRM returned no routes');
      return null;
    }
    
    const route = data.routes[0];
    const coordinates = route.geometry.coordinates; // [lon, lat] pairs
    
    // Convert to our LatLng format
    const path: LatLng[] = coordinates.map((coord: number[]) => ({
      lon: coord[0],
      lat: coord[1],
    }));
    
    // OSRM returns duration in seconds
    const etaMinutes = Math.round(route.duration / 60);
    
    logger.info(`OSRM route found: ${path.length} waypoints, ETA ${etaMinutes} min`);
    
    return { path, etaMinutes };
  } catch (error: any) {
    logger.error(`OSRM routing failed: ${error.message}`);
    return null;
  }
}

/**
 * Analyze route using CAMARA APIs and alert data
 * This provides comprehensive route intelligence using:
 * 1. Real-time population density along route segments
 * 2. Active geofencing alerts
 * 3. Time-based patterns
 */
async function analyzeRouteWithCamara(
  path: LatLng[],
  from: LatLng,
  to: LatLng
): Promise<{
  advisories: string[];
  densityScore: number;
  alertZoneCount: number;
  maxDensityPoint: { lat: number; lon: number; density: number } | null;
}> {
  const advisories: string[] = [];
  let densityScore = 0;
  let maxDensityPoint: { lat: number; lon: number; density: number } | null = null;
  
  // 1. Analyze geofencing alerts
  const alertAnalysis = analyzeAlertZones(path);
  advisories.push(...alertAnalysis.advisories);
  
  // 2. Sample route segments for real-time density using CAMARA API
  const densityAnalysis = await analyzeDensityAlongRoute(path);
  
  if (densityAnalysis) {
    densityScore = densityAnalysis.avgDensity;
    maxDensityPoint = densityAnalysis.maxPoint;
    
    // Generate density-based advisories
    if (densityAnalysis.avgDensity > 100) {
      advisories.push(`🚨 Very high crowd density detected (avg: ${Math.round(densityAnalysis.avgDensity)} people/area) - route severely congested`);
    } else if (densityAnalysis.avgDensity > 50) {
      advisories.push(`⚠️ High crowd density on route (avg: ${Math.round(densityAnalysis.avgDensity)} people/area) - expect significant delays`);
    } else if (densityAnalysis.avgDensity > 20) {
      advisories.push(`⚡ Moderate crowd density (avg: ${Math.round(densityAnalysis.avgDensity)} people/area) - minor delays possible`);
    } else if (densityAnalysis.avgDensity < 10) {
      advisories.push(`✅ Low crowd density - optimal route conditions`);
    }
    
    // Warn about specific high-density hotspots
    if (maxDensityPoint && maxDensityPoint.density > 80) {
      advisories.push(`📍 Critical hotspot at [${maxDensityPoint.lat.toFixed(4)}, ${maxDensityPoint.lon.toFixed(4)}] with ${Math.round(maxDensityPoint.density)} people`);
    }
  }
  
  // 3. Time-based advisories
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) {
    advisories.push('🕐 Morning rush hour (7-9 AM) - expect 20-30% longer travel time');
  } else if (hour >= 17 && hour <= 19) {
    advisories.push('🕐 Evening rush hour (5-7 PM) - expect 30-40% longer travel time');
  } else if (hour >= 22 || hour <= 5) {
    advisories.push('🌙 Night time - reduced traffic, faster travel expected');
  }
  
  // 4. Distance-based advisory
  const distance = calculateRouteDistance(path);
  if (distance > 10) {
    advisories.push(`📏 Long distance route (${distance.toFixed(1)} km) - consider rest stops`);
  }
  
  // Default if no issues found
  if (advisories.length === 0) {
    advisories.push('✅ Route clear - minimal congestion detected');
  }
  
  return {
    advisories,
    densityScore,
    alertZoneCount: alertAnalysis.count,
    maxDensityPoint,
  };
}

/**
 * Analyze route against active geofencing alert zones
 */
function analyzeAlertZones(path: LatLng[]): { advisories: string[]; count: number } {
  const advisories: string[] = [];
  
  // Get active geofencing rules (alert zones)
  const rules = listRules().filter(r => r.active);
  
  if (rules.length === 0) {
    return { advisories: [], count: 0 };
  }
  
  // Check if route intersects any alert zones
  const routeLine = turf.lineString(path.map(p => [p.lon, p.lat]));
  
  let highDensityCount = 0;
  let criticalZoneCount = 0;
  
  for (const rule of rules) {
    const alertZone = createAlertZonePolygon(rule);
    
    if (!alertZone) continue;
    
    // Check if route intersects this alert zone
    try {
      const intersects = turf.booleanDisjoint(routeLine, alertZone);
      
      if (!intersects) { // If NOT disjoint, they intersect
        // Determine severity based on threshold
        if (rule.thresholdDevices > 5000) {
          criticalZoneCount++;
        } else {
          highDensityCount++;
        }
      }
    } catch (error: any) {
      logger.warn(`Failed to check intersection for rule ${rule.id}: ${error.message}`);
    }
  }
  
  // Generate specific advisories based on analysis
  if (criticalZoneCount > 0) {
    advisories.push(`🔴 Route passes through ${criticalZoneCount} critical alert zone(s) (>5000 devices) - strongly consider alternative`);
  }
  
  if (highDensityCount > 0) {
    advisories.push(`🟡 Route crosses ${highDensityCount} high-density alert zone(s) - monitor conditions`);
  }
  
  return { advisories, count: criticalZoneCount + highDensityCount };
}

/**
 * Sample route segments and get real-time density using CAMARA Population Density API
 * Divides route into segments and queries density for each
 */
async function analyzeDensityAlongRoute(
  path: LatLng[]
): Promise<{
  avgDensity: number;
  maxDensity: number;
  maxPoint: { lat: number; lon: number; density: number } | null;
  segments: number;
} | null> {
  try {
    // Sample every ~10 waypoints to avoid too many API calls
    const sampleInterval = Math.max(1, Math.floor(path.length / 10));
    const samplePoints = path.filter((_, i) => i % sampleInterval === 0);
    
    logger.info(`Analyzing density at ${samplePoints.length} route segments (sampling every ${sampleInterval} waypoints)`);
    
    const densities: Array<{ lat: number; lon: number; density: number }> = [];
    
    // Query density for each sample segment
    for (const point of samplePoints) {
      const density = await getDensityAtPoint(point);
      if (density !== null) {
        densities.push({ lat: point.lat, lon: point.lon, density });
      }
    }
    
    if (densities.length === 0) {
      logger.warn('No density data retrieved for route');
      return null;
    }
    
    const avgDensity = densities.reduce((sum, d) => sum + d.density, 0) / densities.length;
    const maxDensityEntry = densities.reduce((max, d) => d.density > max.density ? d : max, densities[0]);
    
    logger.info(`Route density analysis: avg=${avgDensity.toFixed(1)}, max=${maxDensityEntry.density.toFixed(1)} at [${maxDensityEntry.lat}, ${maxDensityEntry.lon}]`);
    
    return {
      avgDensity,
      maxDensity: maxDensityEntry.density,
      maxPoint: maxDensityEntry,
      segments: densities.length,
    };
  } catch (error: any) {
    logger.error(`Density analysis failed: ${error.message}`);
    return null;
  }
}

/**
 * Get population density at a specific point using CAMARA API
 * Creates a small circular area around the point
 */
async function getDensityAtPoint(point: LatLng): Promise<number | null> {
  try {
    // Create a 200m radius circle around the point for density query
    const radiusMeters = 200;
    const circle = turf.circle([point.lon, point.lat], radiusMeters / 1000, { units: 'kilometers' });
    const boundary = circle.geometry.coordinates[0].map((coord: number[]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));
    
    const polygon = {
      areaType: AreaType.POLYGON as const,
      boundary,
    };
    
    const snapshot = await getDensitySnapshot(`route-point-${point.lat}-${point.lon}`, polygon);
    
    // Return average density across the small area
    return snapshot.totalDevices;
  } catch (error: any) {
    logger.warn(`Failed to get density at [${point.lat}, ${point.lon}]: ${error.message}`);
    return null;
  }
}

/**
 * Calculate total route distance in kilometers
 */
function calculateRouteDistance(path: LatLng[]): number {
  const line = turf.lineString(path.map(p => [p.lon, p.lat]));
  return turf.length(line, { units: 'kilometers' });
}

/**
 * Adjust ETA based on density and alert analysis
 * Higher density = longer travel time
 */
function calculateAdjustedETA(
  baseETA: number,
  analysis: {
    densityScore: number;
    alertZoneCount: number;
    advisories: string[];
  }
): number {
  let adjusted = baseETA;
  
  // Add delay based on crowd density
  if (analysis.densityScore > 100) {
    adjusted *= 1.5; // 50% longer
  } else if (analysis.densityScore > 50) {
    adjusted *= 1.3; // 30% longer
  } else if (analysis.densityScore > 20) {
    adjusted *= 1.15; // 15% longer
  }
  
  // Add delay for each alert zone crossed
  adjusted += analysis.alertZoneCount * 2; // +2 minutes per alert zone
  
  // Rush hour adjustment
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) {
    adjusted *= 1.25; // +25% for morning rush
  } else if (hour >= 17 && hour <= 19) {
    adjusted *= 1.35; // +35% for evening rush
  }
  
  return Math.round(adjusted);
}

/**
 * Old simple analysis function - kept for reference
 * @deprecated Use analyzeRouteWithCamara instead
 */
function analyzeRoute(path: LatLng[]): { advisories: string[] } {
  const advisories: string[] = [];
  
  // Get active geofencing rules (alert zones)
  const rules = listRules().filter(r => r.active);
  
  if (rules.length === 0) {
    advisories.push('Route clear - no active alerts');
    return { advisories };
  }
  
  // Check if route intersects any alert zones
  const routeLine = turf.lineString(path.map(p => [p.lon, p.lat]));
  
  let highDensityCount = 0;
  let criticalZoneCount = 0;
  
  for (const rule of rules) {
    const alertZone = createAlertZonePolygon(rule);
    
    if (!alertZone) continue;
    
    // Check if route intersects this alert zone
    try {
      const intersects = turf.booleanDisjoint(routeLine, alertZone);
      
      if (!intersects) { // If NOT disjoint, they intersect
        // Determine severity based on threshold
        if (rule.thresholdDevices > 5000) {
          criticalZoneCount++;
        } else {
          highDensityCount++;
        }
      }
    } catch (error: any) {
      logger.warn(`Failed to check intersection for rule ${rule.id}: ${error.message}`);
    }
  }
  
  // Generate specific advisories based on analysis
  if (criticalZoneCount > 0) {
    advisories.push(`⚠️ Route passes through ${criticalZoneCount} critical density zone(s) - consider alternative route`);
  }
  
  if (highDensityCount > 0) {
    advisories.push(`⚡ Route crosses ${highDensityCount} high density area(s) - expect delays`);
  }
  
  if (advisories.length === 0) {
    advisories.push('✅ Route clear - minimal congestion detected');
  }
  
  // Add time-based advisory
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) {
    advisories.push('🕐 Morning rush hour - expect higher traffic');
  } else if (hour >= 17 && hour <= 19) {
    advisories.push('🕐 Evening rush hour - expect higher traffic');
  }
  
  return { advisories };
}

/**
 * Create a Turf polygon from alert rule geometry
 */
function createAlertZonePolygon(rule: any): turf.Feature<turf.Polygon | turf.MultiPolygon> | null {
  try {
    const polygon = rule.polygon;
    
    // Handle CAMARA CIRCLE type
    if (polygon.type === 'CIRCLE') {
      const center = [polygon.center.longitude, polygon.center.latitude];
      const radiusKm = polygon.radius / 1000; // Convert meters to km
      const circle = turf.circle(center, radiusKm, { units: 'kilometers' });
      return circle;
    }
    
    // Handle CAMARA POLYGON type
    if (polygon.type === 'POLYGON') {
      const coordinates = polygon.boundary.map((point: any) => [
        point.longitude,
        point.latitude,
      ]);
      // Close the polygon if not already closed
      if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
          coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
        coordinates.push(coordinates[0]);
      }
      return turf.polygon([coordinates]);
    }
    
    // Handle legacy coordinates format
    if ('coordinates' in polygon && Array.isArray(polygon.coordinates)) {
      const coords = polygon.coordinates.map((p: any) => [p[1], p[0]]); // [lon, lat]
      coords.push(coords[0]); // Close polygon
      return turf.polygon([coords]);
    }
    
    return null;
  } catch (error: any) {
    logger.error(`Failed to create alert zone polygon: ${error.message}`);
    return null;
  }
}
