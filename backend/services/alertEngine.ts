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
  console.log(`[AlertEngine] Rule added: ${id} (${rule.name}) - Active: ${rule.active}`);
  return r;
}
export function listRules() { return Object.values(rules); }
export function deleteRule(id: string) { 
  console.log(`[AlertEngine] Rule deleted: ${id}`);
  delete rules[id]; 
}
export function subscribeAlerts(handler: (event: AlertEvent) => void) { 
  console.log(`[AlertEngine] New subscriber added (total: ${subscribers.length + 1})`);
  subscribers.push(handler);
  
  // Return unsubscribe function
  return () => {
    const index = subscribers.indexOf(handler);
    if (index > -1) {
      subscribers.splice(index, 1);
      console.log(`[AlertEngine] Subscriber removed (total: ${subscribers.length})`);
    }
  };
}

async function evaluateRule(rule: GeofenceRule) {
  const snap = await getDensitySnapshot(rule.id, ensureClosedPolygon(rule.polygon));
  const evt = mockAlert(rule.id, snap.totalDevices, rule.thresholdDevices);
  
  console.log(`[AlertEngine] Rule ${rule.id} (${rule.name}): ${snap.totalDevices} devices (threshold: ${rule.thresholdDevices}) - Level: ${evt.level}`);
  console.log(`[AlertEngine] Broadcasting to ${subscribers.length} subscriber(s)`);
  
  // Always send alerts to UI subscribers (for real-time monitoring)
  subscribers.forEach((h, index) => {
    try {
      h(evt);
      console.log(`[AlertEngine] Alert sent to subscriber #${index + 1}`);
    } catch (err) {
      console.error(`[AlertEngine] Error sending to subscriber #${index + 1}:`, err);
    }
  });
  
  // Only trigger webhooks for warning/critical alerts
  if (evt.level !== 'info' && rule.alertChannels.includes('webhook') && rule.webhookUrl) {
    await axios.post(rule.webhookUrl, evt).catch((err) => {
      console.error(`[AlertEngine] Webhook failed for rule ${rule.id}:`, err.message);
    });
  }
}

schedule.scheduleJob('*/2 * * * *', async () => {
  const activeRules = Object.values(rules).filter(r => r.active);
  console.log(`[AlertEngine] Scheduled evaluation running - ${activeRules.length} active rule(s)`);
  
  for (const rule of activeRules) {
    try {
      await evaluateRule(rule);
    } catch (err) {
      console.error(`[AlertEngine] Error evaluating rule ${rule.id}:`, err);
    }
  }
});