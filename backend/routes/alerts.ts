import { Router } from 'express';
import { geofenceSchema } from '../models/validators';
import { addRule, listRules, deleteRule, subscribeAlerts } from '../services/alertEngine';

const router = Router();

router.get('/rules', (_req, res) => res.json(listRules()));

router.post('/rules', (req, res) => {
  const parse = geofenceSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid rule', details: parse.error.flatten() });
  const rule = addRule(parse.data);
  res.json(rule);
});

router.delete('/rules/:id', (req, res) => {
  deleteRule(req.params.id);
  res.json({ ok: true });
});

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (evt: any) => {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  };

  subscribeAlerts(send);

  // keep-alive ping
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    res.end();
  });
});

export default router;
