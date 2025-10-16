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

  const baseURL = product.baseUrl ?? cfg.camara.baseUrl;
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

  return new CamaraSDK({
    ...(clientOptions as any),
    defaultHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getCamaraProductConfig(productKey: CamaraProductKey): ProductIntegrationConfig {
  const cfg = loadConfig();
  return cfg.camara.products[productKey];
}