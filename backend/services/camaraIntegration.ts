import CamaraSDK from 'camara-sdk';
import { loadConfig, ProductIntegrationConfig } from '../utils/config';
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
    throw new Error('Real CAMARA integration is disabled while USE_MOCK=true.');
  }
  if (!product.enabled) {
    throw new Error(`CAMARA integration for ${productKey} is disabled. Set CAMARA_${productKey.toUpperCase()}_ENABLED=true to activate.`);
  }
}

export async function createCamaraClient(productKey: CamaraProductKey): Promise<CamaraClient> {
  const cfg = loadConfig();
  const product = cfg.camara.products[productKey];

  ensureProductEnabled(productKey, product, cfg.useMock);

  const baseURL = product.baseUrl ?? cfg.camara.baseUrl;
  if (!baseURL) {
    throw new Error(`CAMARA base URL is missing for product ${productKey}. Set CAMARA_BASE_URL or CAMARA_${productKey.toUpperCase()}_BASE_URL.`);
  }

  const scopes = product.scopes.length > 0 ? product.scopes : cfg.camara.scopes;
  const token = await getAccessTokenForProduct(scopes, product.audience ?? cfg.camara.oauth.audience);

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