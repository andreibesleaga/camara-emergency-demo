import { Router } from 'express';
import logger from '../utils/logger';
import { latLngSchema } from '../models/validators';
import { planRoute } from '../services/routingEngine';

const router = Router();

router.post('/plan', async (req, res) => {
  logger.info(`[RoutingAPI] Planning route request received`);
  
  const pFrom = latLngSchema.safeParse(req.body.from);
  const pTo = latLngSchema.safeParse(req.body.to);
  
  if (!pFrom.success || !pTo.success) {
    logger.warn(`[RoutingAPI] Invalid coordinates: from=${JSON.stringify(req.body.from)}, to=${JSON.stringify(req.body.to)}`);
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  
  logger.info(`[RoutingAPI] Planning route from [${pFrom.data.lat}, ${pFrom.data.lon}] to [${pTo.data.lat}, ${pTo.data.lon}]`);
  
  try {
    const plan = await planRoute(pFrom.data, pTo.data);
    logger.info(`[RoutingAPI] Route planned successfully: ${plan.path.length} waypoints, ETA: ${plan.etaMinutes} min, ${plan.advisories.length} advisories`);
    res.json(plan);
  } catch (error: any) {
    logger.error(`[RoutingAPI] Route planning failed: ${error.message}`);
    res.status(500).json({ error: 'Route planning failed', details: error.message });
  }
});

export default router;
