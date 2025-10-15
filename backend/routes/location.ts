import { Router } from 'express';
import { deviceIdSchema } from '../models/validators';
import { loadConfig } from '../utils/config';
import { CamaraError } from '../models/errors';
import { mockDeviceLocation } from '../services/mockGenerator';
import { getDeviceLocationReal } from '../services/camaraClient';

const router = Router();
const cfg = loadConfig();

router.get('/device/:deviceId', async (req, res, next) => {
  const parse = deviceIdSchema.safeParse(req.params.deviceId);
  if (!parse.success) {
    return next(CamaraError.invalidArgument('Invalid deviceId format'));
  }
  try {
    const data = cfg.useMock ? mockDeviceLocation(parse.data) : await getDeviceLocationReal(parse.data);
    res.json(data);
  } catch (err: any) {
    next(err instanceof CamaraError ? err : CamaraError.unavailable(err?.message || 'Location lookup failed'));
  }
});

export default router;
