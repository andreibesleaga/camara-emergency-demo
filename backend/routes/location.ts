import { Router } from 'express';
import { deviceIdSchema } from '../models/validators';
import { loadConfig } from '../utils/config';
import { mockDeviceLocation } from '../services/mockGenerator';
import { getDeviceLocationReal } from '../services/camaraClient';

const router = Router();
const cfg = loadConfig();

router.get('/device/:deviceId', async (req, res) => {
  const parse = deviceIdSchema.safeParse(req.params.deviceId);
  if (!parse.success) return res.status(400).json({ error: 'Invalid deviceId' });
  try {
    const data = cfg.useMock ? mockDeviceLocation(parse.data) : await getDeviceLocationReal(parse.data);
    res.json(data);
  } catch (err: any) {
    const message = err?.message || 'Location lookup failed';
    const status = cfg.useMock ? 500 : 503;
    res.status(status).json({ error: message });
  }
});

export default router;
