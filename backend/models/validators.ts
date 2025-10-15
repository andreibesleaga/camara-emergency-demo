import { z } from 'zod';
import { isValidPhoneNumber, isValidDevice, isValidPoint, isValidPolygon, AreaType } from './camara-common';

/**
 * CAMARA PhoneNumber validator
 * Pattern: ^\+[1-9][0-9]{4,14}$
 */
export const phoneNumberSchema = z.string().refine(isValidPhoneNumber, {
  message: 'Phone number must be in international format (E.164), e.g., +1234567890',
});

/**
 * CAMARA Point validator
 */
export const pointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * CAMARA PointList validator (3-15 points)
 */
export const pointListSchema = z.array(pointSchema).min(3).max(15);

/**
 * CAMARA Polygon validator
 */
export const camaraPolygonSchema = z.object({
  areaType: z.literal(AreaType.POLYGON),
  boundary: pointListSchema,
});

/**
 * CAMARA Circle validator
 */
export const camaraCircleSchema = z.object({
  areaType: z.literal(AreaType.CIRCLE),
  center: pointSchema,
  radius: z.number().min(1),
});

/**
 * CAMARA Area validator (Circle or Polygon)
 */
export const camaraAreaSchema = z.union([
  camaraCircleSchema,
  camaraPolygonSchema,
]);

/**
 * CAMARA DeviceIpv4Addr validator
 */
export const deviceIpv4AddrSchema = z.object({
  publicAddress: z.string().ip({ version: 'v4' }),
  privateAddress: z.string().ip({ version: 'v4' }).optional(),
  publicPort: z.number().int().min(0).max(65535).optional(),
}).refine(
  (data) => data.privateAddress !== undefined || data.publicPort !== undefined,
  { message: 'Either privateAddress or publicPort must be provided' }
);

/**
 * CAMARA Device validator
 */
export const deviceSchema = z.object({
  phoneNumber: phoneNumberSchema.optional(),
  networkAccessIdentifier: z.string().email().optional(),
  ipv4Address: deviceIpv4AddrSchema.optional(),
  ipv6Address: z.string().ip({ version: 'v6' }).optional(),
}).refine(isValidDevice, {
  message: 'Device must have at least one identifier (phoneNumber, networkAccessIdentifier, ipv4Address, or ipv6Address)',
});

/**
 * Legacy polygon schema for backward compatibility
 * @deprecated Use camaraPolygonSchema instead
 */
export const polygonSchema = z.object({ 
  coordinates: z.array(z.tuple([z.number(), z.number()])) 
});

/**
 * Device identifier - supports phone number or other ID
 */
export const deviceIdSchema = z.string().min(3);

/**
 * Legacy LatLng schema for backward compatibility
 * @deprecated Use pointSchema instead
 */
export const latLngSchema = z.object({ 
  lat: z.number(), 
  lon: z.number() 
});

/**
 * Geofence rule validator - supports both CAMARA and legacy polygon formats
 */
export const geofenceSchema = z.object({
  name: z.string().min(1),
  polygon: z.union([camaraPolygonSchema, polygonSchema]),
  thresholdDevices: z.number().min(1),
  alertChannels: z.array(z.enum(['ui', 'webhook'])),
  webhookUrl: z.string().url().optional(),
  active: z.boolean().default(true),
});

