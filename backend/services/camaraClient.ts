import { DeviceLocation } from '../models/types';
import { loadConfig } from '../utils/config';
import { createCamaraClient } from './camaraIntegration';
import logger from '../utils/logger';

export async function getDeviceLocationReal(deviceId: string): Promise<DeviceLocation> {
  const cfg = loadConfig();

  if (cfg.useMock || !cfg.camara.products.deviceLocation.enabled) {
    throw new Error('Device location integration is disabled. Enable CAMARA_DEVICE_LOCATION_ENABLED and set USE_MOCK=false.');
  }

  if (cfg.camara.products.deviceLocation.usageMode !== 'subscription') {
    logger.warn('Device location product is generally delivered via subscriptions. Ensure your operator supports synchronous retrieval.');
  }

  const client = await createCamaraClient('deviceLocation');
  const subscriptions = await client.devicelocation.subscriptions.list();

  const normalizedId = deviceId.trim();
  const subscription = subscriptions.find((item: any) => {
    const phoneNumber = item?.config?.subscriptionDetail?.device?.phoneNumber;
    return phoneNumber ? phoneNumber.replace(/\s+/g, '') === normalizedId.replace(/\s+/g, '') : false;
  });

  if (!subscription) {
    throw new Error('No CAMARA geofencing subscription found for the requested device. Create a subscription first.');
  }

  throw new Error(
    'Device location data is provided asynchronously by CAMARA. Configure CAMARA_DEVICE_LOCATION_CALLBACK_URL to receive events and surface them to the UI.',
  );
}
