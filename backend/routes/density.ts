import { Router } from 'express';
import { polygonSchema } from '../models/validators';
import { getDensitySnapshot, getFlowSeries } from '../services/densityEngine';

const router = Router();

router.post('/snapshot', async (req, res) => {
  try {
    const parse = polygonSchema.safeParse(req.body.polygon);
    if (!parse.success) return res.status(400).json({ error: 'Invalid polygon' });

    let coords = parse.data.coordinates;
    if (coords.length > 0) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords = [...coords, first]; // close ring
      }
    }

    const areaId = (req.body.areaId as string) || 'area-' + Date.now();
    const snap = await getDensitySnapshot(areaId, { coordinates: coords });
    res.json(snap);
  } catch (err: any) {
    console.error("Density snapshot error:", err);
    res.status(500).json({ error: 'Density snapshot failed', details: err.message });
  }
});

router.get('/flow/:areaId', async (req, res) => {
  const areaId = req.params.areaId;
  const series = await getFlowSeries(areaId);
  res.json(series);
});

export default router;
