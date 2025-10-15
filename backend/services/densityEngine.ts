import ngeohash from 'ngeohash';
import { DensitySnapshot, FlowSeries, Polygon } from '../models/types';
import { Point, AreaType } from '../models/camara-common';
import { mockDensitySnapshot, mockFlowSeries } from './mockGenerator';
import { loadConfig } from '../utils/config';
import { ensureClosedPolygon, createRectangle } from '../utils/geometry';
import { createCamaraClient } from './camaraIntegration';

const cfg = loadConfig();

const DEFAULT_PRECISION = Number(process.env.CAMARA_POPULATION_DENSITY_PRECISION ?? '7');
const FLOW_INTERVAL_MINUTES = 60;
const polygonCache = new Map<string, Polygon>();

type CamaraDensityCell = {
  geohash: string;
  dataType: string;
  pplDensity?: number;
  maxPplDensity?: number;
  minPplDensity?: number;
};

type DensityPointRecord = {
  lat: number;
  lon: number;
  count: number;
};

/**
 * Convert CAMARA Polygon boundary to CAMARA SDK format
 * Input: Polygon with boundary array of Points
 * Output: Array of { latitude, longitude } objects for SDK
 */
function polygonToBoundary(polygon: Polygon): Array<{ latitude: number; longitude: number }> {
  return polygon.boundary.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));
}

function decodeCell(cell: CamaraDensityCell) {
  const { latitude, longitude } = ngeohash.decode(cell.geohash);
  return { lat: latitude, lon: longitude };
}

function aggregateCell(cell: CamaraDensityCell): number {
  if (cell.dataType !== 'DENSITY_ESTIMATION') {
    return 0;
  }
  if (typeof cell.pplDensity === 'number' && !Number.isNaN(cell.pplDensity)) {
    return cell.pplDensity;
  }
  if (typeof cell.maxPplDensity === 'number' && typeof cell.minPplDensity === 'number') {
    return Math.round((cell.maxPplDensity + cell.minPplDensity) / 2);
  }
  return 0;
}

function selectPrecision(): number {
  const precision = Number(process.env.CAMARA_POPULATION_DENSITY_PRECISION);
  if (!Number.isNaN(precision) && precision > 0) {
    return precision;
  }
  return Number.isNaN(DEFAULT_PRECISION) ? 7 : DEFAULT_PRECISION;
}

export async function getDensitySnapshot(areaId: string, polygon: Polygon): Promise<DensitySnapshot> {
  const normalizedPolygon = ensureClosedPolygon(polygon);
  polygonCache.set(areaId, normalizedPolygon);
  if (cfg.useMock || !cfg.camara.products.populationDensity.enabled) {
    return mockDensitySnapshot(areaId, normalizedPolygon);
  }

  const client = await createCamaraClient('populationDensity');
  const boundary = polygonToBoundary(normalizedPolygon);
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - FLOW_INTERVAL_MINUTES * 60 * 1000);

  const response = await client.populationdensitydata.retrieve({
    area: { areaType: AreaType.POLYGON, boundary },
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    precision: selectPrecision(),
  });

  const latestInterval = response.timedPopulationDensityData.slice(-1)[0];

  if (!latestInterval) {
    return {
      areaId,
      timestamp: endTime.toISOString(),
      totalDevices: 0,
      points: [],
    };
  }

  const points: DensityPointRecord[] = latestInterval.cellPopulationDensityData.map((cell: CamaraDensityCell) => {
    const coords = decodeCell(cell);
    return {
      lat: coords.lat,
      lon: coords.lon,
      count: aggregateCell(cell),
    };
  });

  const totalDevices = points.reduce<number>((sum, point) => sum + point.count, 0);

  return {
    areaId,
    timestamp: latestInterval.endTime ?? endTime.toISOString(),
    totalDevices,
    points,
  };
}

export async function getFlowSeries(areaId: string): Promise<FlowSeries> {
  if (cfg.useMock || !cfg.camara.products.populationDensity.enabled) {
    return mockFlowSeries(areaId);
  }

  const client = await createCamaraClient('populationDensity');
  const now = new Date();
  const hoursBack = Number(process.env.CAMARA_POPULATION_DENSITY_FLOW_HOURS ?? '6');
  const startTime = new Date(now.getTime() - hoursBack * FLOW_INTERVAL_MINUTES * 60 * 1000);

  // Use cached polygon or create a default CAMARA Polygon for Bucharest
  const cachedPolygon = polygonCache.get(areaId) ?? createRectangle(44.41, 26.08, 44.44, 26.12);

  const boundary = polygonToBoundary(cachedPolygon);

  const response = await client.populationdensitydata.retrieve({
    area: { areaType: AreaType.POLYGON, boundary },
    startTime: startTime.toISOString(),
    endTime: now.toISOString(),
    precision: selectPrecision(),
  });

  const series = response.timedPopulationDensityData.map((interval: any) => {
    const total = (interval.cellPopulationDensityData as CamaraDensityCell[]).reduce<number>(
      (acc, cell) => acc + aggregateCell(cell),
      0,
    );
    return {
      timestamp: interval.endTime ?? interval.startTime,
      totalDevices: total,
    };
  });

  return {
    areaId,
    intervalMinutes: FLOW_INTERVAL_MINUTES,
    series,
  };
}
