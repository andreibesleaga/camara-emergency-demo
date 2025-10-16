import { Router } from 'express';
import logger from '../utils/logger';
import { deviceIdSchema } from '../models/validators';
import { loadConfig } from '../utils/config';
import { CamaraError } from '../models/errors';
import { mockDeviceLocation } from '../services/mockGenerator';
import { getDeviceLocationReal } from '../services/camaraClient';

const router = Router();
const cfg = loadConfig();

router.get('/device/:deviceId', async (req, res, next) => {
  const deviceId = req.params.deviceId;
  logger.info(`[LocationAPI] Device location request for: ${deviceId}`);
  
  const parse = deviceIdSchema.safeParse(deviceId);
  if (!parse.success) {
    logger.warn(`[LocationAPI] Invalid deviceId format: ${deviceId}`);
    return next(CamaraError.invalidArgument('Invalid deviceId format'));
  }
  
  try {
    if (cfg.useMock) {
      logger.info(`[LocationAPI] Using MOCK data for device: ${parse.data}`);
      const data = mockDeviceLocation(parse.data);
      logger.info(`[LocationAPI] Mock location: [${data.location.lat}, ${data.location.lon}] accuracy: ${data.accuracyMeters}m`);
      res.json(data);
    } else {
      logger.info(`[LocationAPI] Calling REAL CAMARA API for device: ${parse.data}`);
      const data = await getDeviceLocationReal(parse.data);
      logger.info(`[LocationAPI] Real location retrieved: [${data.location.lat}, ${data.location.lon}]`);
      res.json(data);
    }
  } catch (err: any) {
    logger.error(`[LocationAPI] Error retrieving location: ${err.message}`);
    next(err instanceof CamaraError ? err : CamaraError.unavailable(err?.message || 'Location lookup failed'));
  }
});

export default router;
