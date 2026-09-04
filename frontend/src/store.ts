import { create } from 'zustand';

export interface FlowPoint {
  timestamp: string;
  totalDevices: number;
}

export interface DensityPoint {
  lat: number;
  lon: number;
  count: number;
}

export interface DensitySnapshot {
  areaId?: string;
  timestamp?: string;
  totalDevices?: number;
  points: DensityPoint[];
}

export interface DeviceInfo {
  deviceId: string;
  location: { lat: number; lon: number };
  accuracyMeters: number;
  timestamp: string;
  source: string;
}

export interface AlertEvent {
  ruleId: string;
  triggeredAt: string;
  totalDevices: number;
  level: 'info' | 'warning' | 'critical' | string;
  message: string;
}

export interface RoutePlan {
  path: { lat: number; lon: number }[];
  etaMinutes: number;
  advisories: string[];
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface RuleDraft {
  name: string;
  threshold: number;
  webhookUrl: string;
}

/** Connection state of the alert EventSource, surfaced in the top bar. */
export type StreamState = 'connecting' | 'open' | 'error';

export type TabId = 'area' | 'density' | 'alerts' | 'routing' | 'device';

type State = {
  clickedCoords: [number, number] | null;
  setClickedCoords: (coords: [number, number]) => void;
  polygon: [number, number][] | null;
  densityPoints: DensityPoint[];
  /** Reported by the density snapshot rather than recomputed on the client. */
  densityTotal: number | null;
  densityUpdatedAt: string | null;
  flows: FlowPoint[];
  alerts: AlertEvent[];
  route: RoutePlan | null;
  setPolygon(p: [number, number][] | null): void;
  setDensity(points: DensityPoint[]): void;
  setDensitySnapshot(snapshot: DensitySnapshot): void;
  setFlows(series: FlowPoint[]): void;
  pushAlert(a: AlertEvent): void;
  setRoute(r: RoutePlan | null): void;
  flowSeries: FlowPoint[];
  deviceInfo: DeviceInfo | null;
  setFlowSeries: (s: FlowPoint[]) => void;
  setDeviceInfo: (d: DeviceInfo | null) => void;

  /* --- form state, kept in the store so switching tabs never loses input --- */
  areaId: string;
  setAreaId: (id: string) => void;
  areaText: string;
  setAreaText: (text: string) => void;
  routeFrom: LatLon;
  routeTo: LatLon;
  setRouteFrom: (from: LatLon) => void;
  setRouteTo: (to: LatLon) => void;
  rule: RuleDraft;
  setRule: (rule: RuleDraft) => void;
  deviceId: string;
  setDeviceId: (id: string) => void;

  /* --- live alert stream --- */
  streamState: StreamState;
  setStreamState: (state: StreamState) => void;
};

export const DEFAULT_AREA_TEXT = '[[26.08,44.41],[26.12,44.41],[26.12,44.44],[26.08,44.44]]';
export const DEFAULT_DEVICE_ID = '+40700000000';

export const useStore = create<State>((set) => ({
  clickedCoords: null,
  setClickedCoords: (coords) => set({ clickedCoords: coords }),
  polygon: null,
  densityPoints: [],
  densityTotal: null,
  densityUpdatedAt: null,
  flows: [],
  alerts: [],
  route: null,
  setPolygon: (p) => set({ polygon: p }),
  setDensity: (points) => set({ densityPoints: points }),
  setDensitySnapshot: (snapshot) =>
    set({
      densityPoints: Array.isArray(snapshot.points) ? snapshot.points : [],
      densityTotal:
        typeof snapshot.totalDevices === 'number'
          ? snapshot.totalDevices
          : (snapshot.points ?? []).reduce((sum, point) => sum + (point.count ?? 0), 0),
      densityUpdatedAt: snapshot.timestamp ?? new Date().toISOString(),
    }),
  setFlows: (series) => set({ flows: series }),
  pushAlert: (a) => set((s) => ({ alerts: [a, ...s.alerts].slice(0, 50) })),
  setRoute: (r) => set({ route: r }),
  flowSeries: [],
  deviceInfo: null,
  setFlowSeries: (s) => set({ flowSeries: s }),
  setDeviceInfo: (d) => set({ deviceInfo: d }),

  areaId: 'demo-area',
  setAreaId: (id) => set({ areaId: id }),
  areaText: DEFAULT_AREA_TEXT,
  setAreaText: (text) => set({ areaText: text }),
  routeFrom: { lat: 44.4268, lon: 26.1025 },
  routeTo: { lat: 44.439, lon: 26.096 },
  setRouteFrom: (from) => set({ routeFrom: from }),
  setRouteTo: (to) => set({ routeTo: to }),
  rule: { name: 'Bucharest Center Alert', threshold: 3000, webhookUrl: '' },
  setRule: (rule) => set({ rule }),
  deviceId: DEFAULT_DEVICE_ID,
  setDeviceId: (id) => set({ deviceId: id }),

  streamState: 'connecting',
  setStreamState: (state) => set({ streamState: state }),
}));
