import CamaraSDK from 'camara-sdk';
import logger from '../utils/logger';
import { loadConfig, ProductIntegrationConfig } from '../utils/config';
import { CamaraError } from '../models/errors';
import { getAccessTokenForProduct } from './camaraTokenService';

export type CamaraProductKey = 'populationDensity' | 'regionDeviceCount' | 'deviceLocation' | 'alerts';

type CamaraClient = InstanceType<typeof CamaraSDK>;

const REQUIRED_HEADERS = [
  'deviceLocationNotificationsAPIKey',
  'notificationsAPIKey',
  'populationDensityDataNotificationsAPIKey',
  'regionDeviceCountNotificationsAPIKey',
  'connectivityInsightsNotificationsAPIKey',
  'simSwapNotificationsAPIKey',
  'deviceRoamingStatusNotificationsAPIKey',
  'deviceReachabilityStatusNotificationsAPIKey',
  'connectedNetworkTypeNotificationsAPIKey',
] as const;

function ensureProductEnabled(productKey: CamaraProductKey, product: ProductIntegrationConfig, useMock: boolean) {
  if (useMock) {
    throw CamaraError.notImplemented('Real CAMARA integration is disabled while USE_MOCK=true.');
  }
  if (!product.enabled) {
    throw CamaraError.notImplemented(`CAMARA integration for ${productKey} is disabled. Set CAMARA_${productKey.toUpperCase()}_ENABLED=true to activate.`);
  }
}

export async function createCamaraClient(productKey: CamaraProductKey): Promise<CamaraClient> {
  const cfg = loadConfig();
  const product = cfg.camara.products[productKey];

  logger.info(`[CamaraClient] Creating client for product: ${productKey}`);

  ensureProductEnabled(productKey, product, cfg.useMock);

  let baseURL = product.baseUrl ?? cfg.camara.baseUrl;
  if (!baseURL) {
    throw CamaraError.invalidArgument(`CAMARA base URL is missing for product ${productKey}. Set CAMARA_BASE_URL or CAMARA_${productKey.toUpperCase()}_BASE_URL.`);
  }

  logger.info(`[CamaraClient] Using base URL: ${baseURL}`);

  const scopes = product.scopes.length > 0 ? product.scopes : cfg.camara.scopes;
  const token = await getAccessTokenForProduct(scopes, product.audience ?? cfg.camara.oauth.audience);

  logger.info(`[CamaraClient] Client created successfully for ${productKey}`);

  const clientOptions: Record<string, string | undefined> = {
    baseURL,
  };

  for (const header of REQUIRED_HEADERS) {
    clientOptions[header] = token;
  }

  const client = new CamaraSDK({
    ...(clientOptions as any),
    defaultHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Patch the populationdensitydata.retrieve method to use the correct endpoint
  // The SDK uses /populationdensitydata/retrieve but Orange API expects /retrieve
  if (productKey === 'populationDensity') {
    const originalRetrieve = client.populationdensitydata.retrieve.bind(client.populationdensitydata);
    client.populationdensitydata.retrieve = function(params: any, options?: any) {
      // Call the internal _client.post directly with the correct path
      const { 'x-correlator': xCorrelator, ...body } = params;
      return (client.populationdensitydata as any)._client.post('/retrieve', {
        body,
        ...options,
        headers: {
          ...(xCorrelator ? { 'x-correlator': xCorrelator } : {}),
          ...options?.headers,
        },
      });
    };
    logger.info(`[CamaraClient] Patched populationdensitydata.retrieve to use correct endpoint: /retrieve`);
  }

  // Patch devicelocation.subscriptions methods to use the correct endpoints
  // The SDK uses /devicelocation/subscriptions but Orange API expects /subscriptions
  if (productKey === 'deviceLocation') {
    const originalList = client.devicelocation.subscriptions.list.bind(client.devicelocation.subscriptions);
    client.devicelocation.subscriptions.list = function(params?: any, options?: any) {
      const { 'x-correlator': xCorrelator } = params ?? {};
      return (client.devicelocation.subscriptions as any)._client.get('/subscriptions', {
        ...options,
        headers: {
          ...(xCorrelator ? { 'x-correlator': xCorrelator } : {}),
          ...options?.headers,
        },
      });
    };
    
    const originalCreate = client.devicelocation.subscriptions.create.bind(client.devicelocation.subscriptions);
    client.devicelocation.subscriptions.create = function(params: any, options?: any) {
      const { 'x-correlator': xCorrelator, ...body } = params;
      return (client.devicelocation.subscriptions as any)._client.post('/subscriptions', {
        body,
        ...options,
        headers: {
          ...(xCorrelator ? { 'x-correlator': xCorrelator } : {}),
          ...options?.headers,
        },
      });
    };
    
    const originalDelete = client.devicelocation.subscriptions.delete.bind(client.devicelocation.subscriptions);
    client.devicelocation.subscriptions.delete = function(subscriptionId: string, params?: any, options?: any) {
      const { 'x-correlator': xCorrelator } = params ?? {};
      return (client.devicelocation.subscriptions as any)._client.delete(`/subscriptions/${subscriptionId}`, {
        ...options,
        headers: {
          ...(xCorrelator ? { 'x-correlator': xCorrelator } : {}),
          ...options?.headers,
        },
      });
    };
    
    logger.info(`[CamaraClient] Patched devicelocation.subscriptions methods to use correct endpoints: /subscriptions`);
  }

  return client;
}

export function getCamaraProductConfig(productKey: CamaraProductKey): ProductIntegrationConfig {
  const cfg = loadConfig();
  return cfg.camara.products[productKey];
}