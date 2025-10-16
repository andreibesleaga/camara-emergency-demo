import { Router } from 'express';
import logger from '../utils/logger';
import { polygonSchema, camaraPolygonSchema } from '../models/validators';
import { AreaType } from '../models/camara-common';
import { getDensitySnapshot, getFlowSeries } from '../services/densityEngine';

const router = Router();

router.post('/snapshot', async (req, res) => {
  logger.info(`[DensityAPI] Snapshot request received`);
  
  try {
    // Try CAMARA polygon format first
    const camaraParse = camaraPolygonSchema.safeParse(req.body.polygon);
    
    if (camaraParse.success) {
      logger.info(`[DensityAPI] Using CAMARA polygon format`);
      // Already in CAMARA format
      const areaId = (req.body.areaId as string) || 'area-' + Date.now();
      logger.info(`[DensityAPI] Requesting snapshot for area: ${areaId}`);
      
      const snap = await getDensitySnapshot(areaId, camaraParse.data);
      logger.info(`[DensityAPI] Snapshot retrieved: ${snap.totalDevices} devices, ${snap.points.length} points`);
      return res.json(snap);
    }

    // Fall back to legacy format
    const legacyParse = polygonSchema.safeParse(req.body.polygon);
    if (!legacyParse.success) {
      logger.warn(`[DensityAPI] Invalid polygon format`);
      return res.status(400).json({ error: 'Invalid polygon format. Use CAMARA format with areaType and boundary.' });
    }

    logger.info(`[DensityAPI] Converting legacy polygon format to CAMARA`);
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
    logger.info(`[DensityAPI] Requesting snapshot for area: ${areaId}`);
    
    const snap = await getDensitySnapshot(areaId, camaraPolygon);
    logger.info(`[DensityAPI] Snapshot retrieved: ${snap.totalDevices} devices, ${snap.points.length} points`);
    res.json(snap);
  } catch (err: any) {
    logger.error(`[DensityAPI] Snapshot error: ${err.message}`);
    res.status(500).json({ error: 'Density snapshot failed', details: err.message });
  }
});

router.get('/flow/:areaId', async (req, res) => {
  const areaId = req.params.areaId;
  logger.info(`[DensityAPI] Flow series request for area: ${areaId}`);
  
  try {
    const series = await getFlowSeries(areaId);
    logger.info(`[DensityAPI] Flow series retrieved: ${series.series.length} data points`);
    res.json(series);
  } catch (err: any) {
    logger.error(`[DensityAPI] Flow series error: ${err.message}`);
    res.status(500).json({ error: 'Flow series failed', details: err.message });
  }
});

export default router;

