import axios from 'axios';
import { loadConfig, OAuthConfig } from '../utils/config';
import logger from '../utils/logger';

type TokenCacheEntry = {
  accessToken: string;
  expiresAt: number;
};

type CacheKey = string;

const tokenCache = new Map<CacheKey, TokenCacheEntry>();
const pendingFetches = new Map<CacheKey, Promise<string>>();
let resolvedTokenEndpoint: string | null = null;

function buildCacheKey(scopes: string[], audience?: string): CacheKey {
  const normalizedScopes = [...scopes].sort().join(' ');
  return `${normalizedScopes}::${audience ?? ''}`;
}

function computeExpiry(expiresIn?: number): number {
  if (!expiresIn || Number.isNaN(expiresIn)) {
    // Default to 5 minutes if the provider did not include an expiry.
    return Date.now() + 5 * 60 * 1000;
  }
  // Refresh 30 seconds before the token actually expires.
  return Date.now() + Math.max(expiresIn - 30, 5) * 1000;
}

async function resolveTokenEndpoint(oauth: OAuthConfig): Promise<string> {
  if (oauth.tokenUrl) return oauth.tokenUrl;
  if (resolvedTokenEndpoint) return resolvedTokenEndpoint;

  if (!oauth.discoveryUrl) {
    throw new Error('CAMARA_OAUTH_TOKEN_URL or CAMARA_OAUTH_DISCOVERY_URL must be provided for live mode.');
  }

  logger.info(`[TokenService] Resolving OAuth token endpoint via discovery: ${oauth.discoveryUrl}`);
  const discoveryResponse = await axios.get(oauth.discoveryUrl, { timeout: 10_000 });
  const tokenEndpoint = discoveryResponse.data?.token_endpoint;
  if (!tokenEndpoint) {
    throw new Error(`OpenID discovery document at ${oauth.discoveryUrl} does not contain token_endpoint.`);
  }
  logger.info(`[TokenService] Discovered token endpoint: ${tokenEndpoint}`);
  resolvedTokenEndpoint = tokenEndpoint;
  return tokenEndpoint;
}

async function fetchAccessToken(cacheKey: CacheKey, scopes: string[], audience?: string): Promise<string> {
  const cfg = loadConfig();
  const { oauth } = cfg.camara;

  const clientId = oauth.clientId ?? cfg.camara.clientId;
  const clientSecret = oauth.clientSecret ?? cfg.camara.clientSecret;

  if (!clientId) {
    throw new Error('Client ID is required to request CAMARA access tokens.');
  }

  const tokenUrl = await resolveTokenEndpoint(oauth);

  const params = new URLSearchParams();
  params.set('grant_type', oauth.grantType || 'client_credentials');
  params.set('client_id', clientId);

  if (clientSecret) {
    // Some providers require client_secret in the body even when basic auth is used.
    params.set('client_secret', clientSecret);
  }

  const scopeList = scopes.length > 0 ? scopes : oauth.defaultScopes;
  if (scopeList.length > 0) {
    params.set('scope', scopeList.join(' '));
  }

  const effectiveAudience = audience ?? oauth.audience;
  const additionalParams: Record<string, string> = { ...oauth.additionalParams };
  if (effectiveAudience) {
    additionalParams.audience = effectiveAudience;
  }

  for (const [key, value] of Object.entries(additionalParams)) {
    if (value && !params.has(key)) {
      params.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (clientSecret) {
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${encoded}`;
  }

  logger.info(`[TokenService] Requesting OAuth token from: ${tokenUrl} (scopes: ${scopeList.join(' ') || 'default'}, audience: ${effectiveAudience || 'none'})`);

  const response = await axios.post(tokenUrl, params, {
    headers,
    timeout: 10_000,
  });

  const accessToken: string | undefined = response.data?.access_token;
  const expiresIn: number | undefined = response.data?.expires_in;

  if (!accessToken) {
    logger.error(`[TokenService] Token endpoint did not return access_token`);
    throw new Error(`Token endpoint ${tokenUrl} did not return an access_token.`);
  }

  logger.info(`[TokenService] OAuth token obtained successfully (expires in: ${expiresIn || 'unknown'}s)`);

  tokenCache.set(cacheKey, {
    accessToken,
    expiresAt: computeExpiry(typeof expiresIn === 'string' ? Number(expiresIn) : expiresIn),
  });

  return accessToken;
}

export async function getAccessTokenForProduct(scopes: string[], audience?: string): Promise<string> {
  const cacheKey = buildCacheKey(scopes, audience);
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    logger.info(`[TokenService] Using cached OAuth token (scopes: ${scopes.join(' ')})`);
    return cached.accessToken;
  }

  logger.info(`[TokenService] Cache miss or expired, fetching new OAuth token (scopes: ${scopes.join(' ')})`);

  const pending = pendingFetches.get(cacheKey);
  if (pending) {
    logger.info(`[TokenService] Token fetch already in progress, waiting...`);
    return pending;
  }

  const fetchPromise = fetchAccessToken(cacheKey, scopes, audience)
    .catch((err) => {
      logger.error(`[TokenService] Token fetch failed: ${err.message}`);
      pendingFetches.delete(cacheKey);
      throw err;
    })
    .then((token) => {
      pendingFetches.delete(cacheKey);
      return token;
    });

  pendingFetches.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export function clearTokenCache() {
  tokenCache.clear();
  pendingFetches.clear();
}