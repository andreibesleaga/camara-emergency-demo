import { RoutePlan, LatLng } from '../models/types';
import { mockRoute } from './mockGenerator';

export async function planRoute(from: LatLng, to: LatLng): Promise<RoutePlan> {
  return mockRoute(from, to);
}
