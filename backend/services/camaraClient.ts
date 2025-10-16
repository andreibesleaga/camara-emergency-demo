import { DeviceLocation } from '../models/types';
import { CamaraError } from '../models/errors';
import { loadConfig } from '../utils/config';
import { createCamaraClient } from './camaraIntegration';
import logger from '../utils/logger';

export async function getDeviceLocationReal(deviceId: string): Promise<DeviceLocation> {
  const cfg = loadConfig();

  if (cfg.useMock || !cfg.camara.products.deviceLocation.enabled) {
    throw CamaraError.notImplemented('Device location integration is disabled. Enable CAMARA_DEVICE_LOCATION_ENABLED and set USE_MOCK=false.');
  }

  const client = await createCamaraClient('deviceLocation');
  
  logger.info(`[DeviceLocation] Calling location retrieval for device: ${deviceId}`);
  try {
    // Call /retrieve endpoint directly (Orange location-retrieval API)
    // Use the same pattern as the populationdensitydata patch
    const response = await (client as any).post('/retrieve', {
      body: {
        device: {
          phoneNumber: deviceId
        }
      }
    });
    
    logger.info(`[DeviceLocation] Location retrieved successfully: ${JSON.stringify(response).substring(0, 300)}`);
    
    // Map Orange API response to DeviceLocation format
    const location: DeviceLocation = {
      deviceId: deviceId,
      timestamp: new Date().toISOString(),
      location: {
        lat: response.area?.center?.latitude || response.latitude || 0,
        lon: response.area?.center?.longitude || response.longitude || 0,
      },
      accuracyMeters: response.area?.radius || response.accuracy || 0,
      source: 'network',
    };
    
    return location;
  } catch (err: any) {
    logger.error(`[DeviceLocation] Error retrieving location:`, err);
    logger.error(`[DeviceLocation] Error details: ${JSON.stringify({
      message: err.message,
      status: err.status,
      response: err.response?.data,
      url: err.config?.url,
      method: err.config?.method
    }, null, 2)}`);
    
    // Provide helpful error messages
    if (err.status === 403 && err.message?.includes('does not exist')) {
      throw CamaraError.notFound(`Device ${deviceId} is not registered or authorized for location retrieval with this Orange API client.`);
    }
    
    throw err;
  }
}
