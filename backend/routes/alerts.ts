import { Router } from 'express';
import logger from '../utils/logger';
import { geofenceSchema } from '../models/validators';
import { addRule, listRules, deleteRule, subscribeAlerts } from '../services/alertEngine';
import { legacyPolygonToCamara } from '../utils/geometry';
import { AreaType } from '../models/camara-common';

const router = Router();

router.get('/rules', (_req, res) => {
  logger.info(`[AlertsAPI] Listing all alert rules`);
  const rules = listRules();
  logger.info(`[AlertsAPI] Found ${rules.length} alert rules`);
  res.json(rules);
});

router.post('/rules', (req, res) => {
  logger.info(`[AlertsAPI] Creating new alert rule: ${req.body.name || 'unnamed'}`);
  
  const parse = geofenceSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn(`[AlertsAPI] Invalid rule data: ${JSON.stringify(parse.error.flatten())}`);
    return res.status(400).json({ error: 'Invalid rule', details: parse.error.flatten() });
  }
  
  let ruleData = parse.data;
  
  // Convert legacy polygon format to CAMARA format if needed
  if ('coordinates' in ruleData.polygon) {
    logger.info(`[AlertsAPI] Converting legacy polygon format to CAMARA`);
    ruleData = {
      ...ruleData,
      polygon: legacyPolygonToCamara(ruleData.polygon as any)
    };
  }
  
  const rule = addRule(ruleData as any);
  logger.info(`[AlertsAPI] Alert rule created: ${rule.id} (${rule.name})`);
  res.json(rule);
});

router.delete('/rules/:id', (req, res) => {
  logger.info(`[AlertsAPI] Deleting alert rule: ${req.params.id}`);
  deleteRule(req.params.id);
  logger.info(`[AlertsAPI] Alert rule deleted: ${req.params.id}`);
  res.json({ ok: true });
});

router.get('/stream', (req, res) => {
  logger.info(`[AlertsAPI] SSE client connected from ${req.ip}`);
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (evt: any) => {
    logger.info(`[AlertsAPI] Broadcasting alert to SSE client: ${evt.ruleId} (${evt.level})`);
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  };

  // Subscribe and get unsubscribe function
  const unsubscribe = subscribeAlerts(send);

  // keep-alive ping
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 20000);

  req.on('close', () => {
    logger.info(`[AlertsAPI] SSE client disconnected from ${req.ip}`);
    clearInterval(keepAlive);
    unsubscribe(); // Remove this subscriber from the list
    res.end();
  });
});

export default router;
