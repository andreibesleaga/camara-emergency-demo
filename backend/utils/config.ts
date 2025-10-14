type UsageMode = 'synchronous' | 'asynchronous' | 'subscription';

export type ProductIntegrationConfig = {
  /** Whether the integration should be considered active. */
  enabled: boolean;
  /** Optional override for the API base URL (defaults to the global CAMARA base URL). */
  baseUrl?: string;
  /** Contract identifier issued by the operator for this product. */
  contractId?: string;
  /** Audience/Resource identifier expected by the operator when requesting tokens. */
  audience?: string;
  /** Fully-qualified scope string(s) required for this product. */
  scopes: string[];
  /** Canonical usage pattern as described by the CAMARA spec. */
  usageMode: UsageMode;
  /** Optional callback endpoint the operator will push notifications to. */
  callbackUrl?: string;
  /** Optional static authorization header to validate push callbacks. */
  callbackAuthHeader?: string;
  /** Free-form notes for operators (eg. required query params, payload expectations). */
  notes?: string;
};

export type OAuthConfig = {
  issuer?: string;
  discoveryUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  audience?: string;
  defaultScopes: string[];
  grantType: string;
  /** Extra key-value pairs to send when exchanging tokens (eg. audience). */
  additionalParams: Record<string, string>;
};

export type OperatorConfig = {
  name?: string;
  sandboxContractId?: string;
  tenant?: string;
  applicationId?: string;
  /** Orange Network APIs developer portal specific values. */
  orange?: {
    applicationId?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    scopes: string[];
  };
};

export type CamaraConfig = {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  tenant?: string;
  scope?: string;
  scopes: string[];
  oauth: OAuthConfig;
  operator: OperatorConfig;
  products: {
    populationDensity: ProductIntegrationConfig;
    regionDeviceCount: ProductIntegrationConfig;
    deviceLocation: ProductIntegrationConfig;
    alerts: ProductIntegrationConfig;
  };
  callbacks: {
    baseUrl?: string;
    authHeader?: string;
  };
};

export type AppConfig = {
  useMock: boolean;
  camara: CamaraConfig;
  map: {
    center: [number, number];
    zoom: number;
  };
};

const DEFAULT_USAGE_MODES: Record<string, UsageMode> = {
  POPULATION_DENSITY: 'asynchronous',
  REGION_DEVICE_COUNT: 'asynchronous',
  DEVICE_LOCATION: 'subscription',
  ALERTS: 'subscription',
};

const TRUE_VALUES = new Set(['true', '1', 'yes', 'y']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n']);

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return fallback;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseUsageMode(value: string | undefined, fallback: UsageMode, productKey: string): UsageMode {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['sync', 'synchronous', 'direct', 'on-demand'].includes(normalized)) return 'synchronous';
  if (['async', 'asynchronous', 'callback', 'webhook'].includes(normalized)) return 'asynchronous';
  if (['subscription', 'event', 'stream'].includes(normalized)) return 'subscription';
  console.warn(`Unknown usage mode "${value}" for ${productKey}; using fallback (${fallback}).`);
  return fallback;
}

function buildProductConfig(
  productKey: 'POPULATION_DENSITY' | 'REGION_DEVICE_COUNT' | 'DEVICE_LOCATION' | 'ALERTS',
  useMock: boolean,
  sandboxContractId: string | undefined,
  defaultScopes: string[],
): ProductIntegrationConfig {
  const prefix = `CAMARA_${productKey}`;
  const explicitEnabled = parseOptionalBoolean(readEnv(`${prefix}_ENABLED`));
  const fallbackEnabled = !useMock;
  const defaultUsage = DEFAULT_USAGE_MODES[productKey] ?? 'asynchronous';
  const usageMode = parseUsageMode(readEnv(`${prefix}_USAGE_MODE`), defaultUsage, productKey);
  const scopes = parseList(readEnv(`${prefix}_SCOPES`));
  return {
    enabled: explicitEnabled ?? fallbackEnabled,
    baseUrl: readEnv(`${prefix}_BASE_URL`),
    contractId: readEnv(`${prefix}_CONTRACT_ID`) ?? sandboxContractId,
    audience: readEnv(`${prefix}_AUDIENCE`),
    scopes: scopes.length > 0 ? scopes : defaultScopes,
    usageMode,
    callbackUrl: readEnv(`${prefix}_CALLBACK_URL`),
    callbackAuthHeader: readEnv(`${prefix}_CALLBACK_AUTH_HEADER`),
    notes: readEnv(`${prefix}_NOTES`),
  };
}

export function loadConfig(): AppConfig {
  const useMock = parseBoolean(readEnv('USE_MOCK'), true);

  const baseScope = readEnv('CAMARA_SCOPE');
  const baseScopeList = parseList(baseScope);
  const supplementalScopeList = parseList(readEnv('CAMARA_SCOPES'));
  const oauthScopes = parseList(readEnv('CAMARA_OAUTH_SCOPES'));
  const defaultScopes =
    oauthScopes.length > 0 ? oauthScopes : supplementalScopeList.length > 0 ? supplementalScopeList : baseScopeList;

  const sandboxContractId = readEnv('CAMARA_SANDBOX_CONTRACT_ID');

  const camaraConfig: CamaraConfig = {
    baseUrl: readEnv('CAMARA_BASE_URL'),
    clientId: readEnv('CAMARA_CLIENT_ID'),
    clientSecret: readEnv('CAMARA_CLIENT_SECRET'),
    tenant: readEnv('CAMARA_TENANT'),
    scope: baseScope,
    scopes: defaultScopes,
    oauth: {
      issuer: readEnv('CAMARA_OAUTH_ISSUER'),
      discoveryUrl: readEnv('CAMARA_OAUTH_DISCOVERY_URL'),
      tokenUrl: readEnv('CAMARA_OAUTH_TOKEN_URL'),
      clientId: readEnv('CAMARA_OAUTH_CLIENT_ID') ?? readEnv('CAMARA_CLIENT_ID'),
      clientSecret: readEnv('CAMARA_OAUTH_CLIENT_SECRET') ?? readEnv('CAMARA_CLIENT_SECRET'),
      audience: readEnv('CAMARA_OAUTH_AUDIENCE'),
      defaultScopes,
      grantType: readEnv('CAMARA_OAUTH_GRANT_TYPE') ?? 'client_credentials',
      additionalParams: {
        ...(readEnv('CAMARA_OAUTH_RESOURCE') ? { resource: readEnv('CAMARA_OAUTH_RESOURCE')! } : {}),
        ...(readEnv('CAMARA_OAUTH_AUDIENCE') ? { audience: readEnv('CAMARA_OAUTH_AUDIENCE')! } : {}),
      },
    },
    operator: {
      name: readEnv('CAMARA_OPERATOR_NAME'),
      sandboxContractId,
      tenant: readEnv('CAMARA_TENANT'),
      applicationId: readEnv('CAMARA_APPLICATION_ID'),
      orange: {
        applicationId: readEnv('ORANGE_APPLICATION_ID'),
        clientId: readEnv('ORANGE_CLIENT_ID'),
        clientSecret: readEnv('ORANGE_CLIENT_SECRET'),
        tokenUrl: readEnv('ORANGE_TOKEN_URL'),
        scopes: parseList(readEnv('ORANGE_SCOPES')),
      },
    },
    products: {
      populationDensity: buildProductConfig('POPULATION_DENSITY', useMock, sandboxContractId, defaultScopes),
      regionDeviceCount: buildProductConfig('REGION_DEVICE_COUNT', useMock, sandboxContractId, defaultScopes),
      deviceLocation: buildProductConfig('DEVICE_LOCATION', useMock, sandboxContractId, defaultScopes),
      alerts: buildProductConfig('ALERTS', useMock, sandboxContractId, defaultScopes),
    },
    callbacks: {
      baseUrl: readEnv('CAMARA_CALLBACK_BASE_URL'),
      authHeader: readEnv('CAMARA_CALLBACK_AUTH_HEADER'),
    },
  };

  return {
    useMock,
    camara: camaraConfig,
    map: {
      center: (readEnv('MAP_DEFAULT_CENTER') || '44.4268,26.1025').split(',').map(Number) as [number, number],
      zoom: Number(readEnv('MAP_DEFAULT_ZOOM') || 12),
    },
  };
}
