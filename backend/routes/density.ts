import { Router } from 'express';
import { polygonSchema, camaraPolygonSchema } from '../models/validators';
import { AreaType } from '../models/camara-common';
import { getDensitySnapshot, getFlowSeries } from '../services/densityEngine';

const router = Router();

router.post('/snapshot', async (req, res) => {
  try {
    // Try CAMARA polygon format first
    const camaraParse = camaraPolygonSchema.safeParse(req.body.polygon);
    
    if (camaraParse.success) {
      // Already in CAMARA format
      const areaId = (req.body.areaId as string) || 'area-' + Date.now();
      const snap = await getDensitySnapshot(areaId, camaraParse.data);
      return res.json(snap);
    }

    // Fall back to legacy format
    const legacyParse = polygonSchema.safeParse(req.body.polygon);
    if (!legacyParse.success) {
      return res.status(400).json({ error: 'Invalid polygon format. Use CAMARA format with areaType and boundary.' });
    }

    // Convert legacy format to CAMARA format
    let coords = legacyParse.data.coordinates;
    const boundary = coords.map(([lon, lat]) => ({
      latitude: lat,
      longitude: lon,
    }));

    // Ensure closed
    if (boundary.length > 0) {
      const first = boundary[0];
      const last = boundary[boundary.length - 1];
      if (first.latitude !== last.latitude || first.longitude !== last.longitude) {
        boundary.push(first);
      }
    }

    const camaraPolygon = {
      areaType: AreaType.POLYGON as const,
      boundary,
    };

    const areaId = (req.body.areaId as string) || 'area-' + Date.now();
    const snap = await getDensitySnapshot(areaId, camaraPolygon);
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

