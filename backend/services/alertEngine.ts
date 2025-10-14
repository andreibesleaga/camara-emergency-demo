import { GeofenceRule, AlertEvent } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { mockAlert } from './mockGenerator';
import { getDensitySnapshot } from './densityEngine';
import schedule from 'node-schedule';
import axios from 'axios';
import { ensureClosedPolygon } from '../utils/geometry';

const rules: Record<string, GeofenceRule> = {};
const subscribers: ((event: AlertEvent) => void)[] = [];

export function addRule(rule: Omit<GeofenceRule, 'id'>): GeofenceRule {
  const id = uuidv4();
  const r: GeofenceRule = { id, ...rule };
  rules[id] = r;
  return r;
}
export function listRules() { return Object.values(rules); }
export function deleteRule(id: string) { delete rules[id]; }
export function subscribeAlerts(handler: (event: AlertEvent) => void) { subscribers.push(handler); }

async function evaluateRule(rule: GeofenceRule) {
  const snap = await getDensitySnapshot(rule.id, ensureClosedPolygon(rule.polygon));
  const evt = mockAlert(rule.id, snap.totalDevices, rule.thresholdDevices);
  if (evt.level !== 'info') {
    subscribers.forEach(h => h(evt));
    if (rule.alertChannels.includes('webhook') && rule.webhookUrl) {
      await axios.post(rule.webhookUrl, evt).catch(() => {});
    }
  }
}

schedule.scheduleJob('*/2 * * * *', async () => {
  for (const rule of Object.values(rules)) {
    if (!rule.active) continue;
    try {
      await evaluateRule(rule);
    } catch (err) {
      console.error("Error evaluating rule", rule.id, err);
    }
  }
});