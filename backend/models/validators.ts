import { z } from 'zod';
export const polygonSchema = z.object({ coordinates: z.array(z.tuple([z.number(), z.number()])) });
export const deviceIdSchema = z.string().min(3);
export const latLngSchema = z.object({ lat: z.number(), lon: z.number() });
export const geofenceSchema = z.object({
  name: z.string().min(1),
  polygon: polygonSchema,
  thresholdDevices: z.number().min(1),
  alertChannels: z.array(z.enum(['ui','webhook'])),
  webhookUrl: z.string().url().optional(),
  active: z.boolean().default(true)
});
