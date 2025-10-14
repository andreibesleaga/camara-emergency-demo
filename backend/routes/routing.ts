import { Router } from 'express';
import { latLngSchema } from '../models/validators';
import { planRoute } from '../services/routingEngine';

const router = Router();

router.post('/plan', async (req, res) => {
  const pFrom = latLngSchema.safeParse(req.body.from);
  const pTo = latLngSchema.safeParse(req.body.to);
  if (!pFrom.success || !pTo.success) return res.status(400).json({ error: 'Invalid coordinates' });
  const plan = await planRoute(pFrom.data, pTo.data);
  res.json(plan);
});

export default router;
