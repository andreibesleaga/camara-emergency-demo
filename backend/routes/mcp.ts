import { Router } from 'express';

const router = Router();

router.post('/invoke', async (req, res) => {
  const { tool, args } = req.body || {};
  try {
    const base = `${req.protocol}://${req.get('host')}`;
    if (tool === 'getDeviceLocation') {
      const r = await fetch(`${base}/api/location/device/${encodeURIComponent(args.deviceId)}`).then(r => r.json());
      return res.json(r);
    }
    if (tool === 'getDensitySnapshot') {
      const r = await fetch(`${base}/api/density/snapshot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args)
      }).then(r => r.json());
      return res.json(r);
    }
    if (tool === 'createGeofenceRule') {
      const r = await fetch(`${base}/api/alerts/rules`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args)
      }).then(r => r.json());
      return res.json(r);
    }
    if (tool === 'planRoute') {
      const r = await fetch(`${base}/api/routing/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args)
      }).then(r => r.json());
      return res.json(r);
    }
    return res.status(400).json({ error: 'Unknown tool' });
  } catch {
    return res.status(500).json({ error: 'MCP invocation failed' });
  }
});

export default router;
