import { Router } from 'express';
import { geofenceSchema } from '../models/validators';
import { addRule, listRules, deleteRule, subscribeAlerts } from '../services/alertEngine';
import { legacyPolygonToCamara } from '../utils/geometry';
import { AreaType } from '../models/camara-common';

const router = Router();

router.get('/rules', (_req, res) => res.json(listRules()));

router.post('/rules', (req, res) => {
  const parse = geofenceSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid rule', details: parse.error.flatten() });
  
  let ruleData = parse.data;
  
  // Convert legacy polygon format to CAMARA format if needed
  if ('coordinates' in ruleData.polygon) {
    ruleData = {
      ...ruleData,
      polygon: legacyPolygonToCamara(ruleData.polygon as any)
    };
  }
  
  const rule = addRule(ruleData as any);
  res.json(rule);
});

router.delete('/rules/:id', (req, res) => {
  deleteRule(req.params.id);
  res.json({ ok: true });
});

router.get('/stream', (req, res) => {
  console.log('[AlertsRoute] SSE client connected');
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (evt: any) => {
    console.log('[AlertsRoute] Sending alert to SSE client:', evt);
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  };

  // Subscribe and get unsubscribe function
  const unsubscribe = subscribeAlerts(send);

  // keep-alive ping
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 20000);

  req.on('close', () => {
    console.log('[AlertsRoute] SSE client disconnected');
    clearInterval(keepAlive);
    unsubscribe(); // Remove this subscriber from the list
    res.end();
  });
});

export default router;
