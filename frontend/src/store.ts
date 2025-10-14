import { create } from 'zustand';

interface FlowPoint {
  timestamp: string;
  totalDevices: number;
}

interface DeviceInfo {
  deviceId: string;
  location: { lat: number; lon: number };
  accuracyMeters: number;
  timestamp: string;
  source: string;
}

type State = {
  clickedCoords: [number, number] | null;
  setClickedCoords: (coords: [number, number]) => void;
  polygon: [number, number][] | null;
  densityPoints: { lat: number; lon: number; count: number }[];
  flows: { timestamp: string; totalDevices: number }[];
  alerts: any[];
  route: { path: { lat: number; lon: number }[]; etaMinutes: number; advisories: string[] } | null;
  setPolygon(p: [number, number][] | null): void;
  setDensity(points: any[]): void;
  setFlows(series: any[]): void;
  pushAlert(a: any): void;
  setRoute(r: any): void;
  flowSeries: FlowPoint[];
  deviceInfo: DeviceInfo | null;
  setFlowSeries: (s: FlowPoint[]) => void;
  setDeviceInfo: (d: DeviceInfo | null) => void;
};
export const useStore = create<State>((set) => ({
  clickedCoords: null,
  setClickedCoords: (coords) => set({ clickedCoords: coords }),
  polygon: null,
  densityPoints: [],
  flows: [],
  alerts: [],
  route: null,
  setPolygon: (p) => set({ polygon: p }),
  setDensity: (points) => set({ densityPoints: points }),
  setFlows: (series) => set({ flows: series }),
  pushAlert: (a) => set(s => ({ alerts: [a, ...s.alerts].slice(0, 50) })),
  setRoute: (r) => set({ route: r }),
  flowSeries: [],
  deviceInfo: null,
  setFlowSeries: (s) => set({ flowSeries: s }),
  setDeviceInfo: (d) => set({ deviceInfo: d }),
}));
