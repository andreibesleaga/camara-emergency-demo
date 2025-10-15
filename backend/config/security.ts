/**
 * Security configuration for CAMARA Emergency Demo
 * 
 * Provides configurable security middleware including:
 * - Rate limiting
 * - Helmet security headers
 * - CORS policies
 * - Request sanitization
 * - Compression
 */

export interface SecurityConfig {
  /** Enable/disable all security features */
  enabled: boolean;
  
  /** Rate limiting configuration */
  rateLimit: {
    enabled: boolean;
    /** Maximum requests per window */
    maxRequests: number;
    /** Time window in minutes */
    windowMinutes: number;
    /** Custom message when rate limit exceeded */
    message?: string;
    /** Skip rate limiting for certain IPs (comma-separated) */
    skipIps?: string[];
  };
  
  /** Helmet security headers configuration */
  helmet: {
    enabled: boolean;
    /** Content Security Policy */
    contentSecurityPolicy: boolean;
    /** DNS Prefetch Control */
    dnsPrefetchControl: boolean;
    /** Frameguard (clickjacking protection) */
    frameguard: boolean;
    /** Hide X-Powered-By header */
    hidePoweredBy: boolean;
    /** HSTS (HTTP Strict Transport Security) */
    hsts: boolean;
    /** IE No Open (IE8+ download protection) */
    ieNoOpen: boolean;
    /** No Sniff (MIME type sniffing protection) */
    noSniff: boolean;
    /** Permitted Cross-Domain Policies */
    permittedCrossDomainPolicies: boolean;
    /** Referrer Policy */
    referrerPolicy: boolean;
    /** XSS Filter */
    xssFilter: boolean;
  };
  
  /** CORS configuration */
  cors: {
    enabled: boolean;
    /** Allowed origins (comma-separated or '*') */
    origins: string;
    /** Allowed methods */
    methods: string[];
    /** Allow credentials */
    credentials: boolean;
  };
  
  /** Request sanitization */
  sanitization: {
    /** Enable NoSQL injection protection */
    noSqlInjection: boolean;
    /** Enable HTTP Parameter Pollution protection */
    hpp: boolean;
  };
  
  /** Response compression */
  compression: {
    enabled: boolean;
    /** Compression level (0-9, 6 is default) */
    level: number;
    /** Minimum response size to compress (bytes) */
    threshold: number;
  };
  
  /** Request body limits */
  bodyLimits: {
    /** JSON body size limit */
    json: string;
    /** URL-encoded body size limit */
    urlencoded: string;
  };
  
  /** Trust proxy settings (for accurate IP detection behind load balancers) */
  trustProxy: boolean | number | string;
}

/**
 * Load security configuration from environment variables
 */
export function loadSecurityConfig(): SecurityConfig {
  const env = process.env;
  
  // Helper to parse boolean
  const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (!value) return fallback;
    const lower = value.toLowerCase().trim();
    if (['true', '1', 'yes', 'y', 'on'].includes(lower)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(lower)) return false;
    return fallback;
  };
  
  // Helper to parse number
  const parseNumber = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  };
  
  // Helper to parse comma-separated list
  const parseList = (value: string | undefined, fallback: string[]): string[] => {
    if (!value) return fallback;
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  };
  
  return {
    enabled: parseBoolean(env.SECURITY_ENABLED, true),
    
    rateLimit: {
      enabled: parseBoolean(env.SECURITY_RATE_LIMIT_ENABLED, true),
      maxRequests: parseNumber(env.SECURITY_RATE_LIMIT_MAX_REQUESTS, 100),
      windowMinutes: parseNumber(env.SECURITY_RATE_LIMIT_WINDOW_MINUTES, 15),
      message: env.SECURITY_RATE_LIMIT_MESSAGE || 'Too many requests, please try again later.',
      skipIps: parseList(env.SECURITY_RATE_LIMIT_SKIP_IPS, []),
    },
    
    helmet: {
      enabled: parseBoolean(env.SECURITY_HELMET_ENABLED, true),
      contentSecurityPolicy: parseBoolean(env.SECURITY_HELMET_CSP, false), // Disabled by default for dev
      dnsPrefetchControl: parseBoolean(env.SECURITY_HELMET_DNS_PREFETCH, true),
      frameguard: parseBoolean(env.SECURITY_HELMET_FRAMEGUARD, true),
      hidePoweredBy: parseBoolean(env.SECURITY_HELMET_HIDE_POWERED_BY, true),
      hsts: parseBoolean(env.SECURITY_HELMET_HSTS, true),
      ieNoOpen: parseBoolean(env.SECURITY_HELMET_IE_NO_OPEN, true),
      noSniff: parseBoolean(env.SECURITY_HELMET_NO_SNIFF, true),
      permittedCrossDomainPolicies: parseBoolean(env.SECURITY_HELMET_CROSS_DOMAIN, true),
      referrerPolicy: parseBoolean(env.SECURITY_HELMET_REFERRER_POLICY, true),
      xssFilter: parseBoolean(env.SECURITY_HELMET_XSS_FILTER, true),
    },
    
    cors: {
      enabled: parseBoolean(env.SECURITY_CORS_ENABLED, true),
      origins: env.SECURITY_CORS_ORIGINS || '*',
      methods: parseList(env.SECURITY_CORS_METHODS, ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
      credentials: parseBoolean(env.SECURITY_CORS_CREDENTIALS, false),
    },
    
    sanitization: {
      noSqlInjection: parseBoolean(env.SECURITY_SANITIZE_NOSQL, true),
      hpp: parseBoolean(env.SECURITY_SANITIZE_HPP, true),
    },
    
    compression: {
      enabled: parseBoolean(env.SECURITY_COMPRESSION_ENABLED, true),
      level: parseNumber(env.SECURITY_COMPRESSION_LEVEL, 6),
      threshold: parseNumber(env.SECURITY_COMPRESSION_THRESHOLD, 1024),
    },
    
    bodyLimits: {
      json: env.SECURITY_BODY_LIMIT_JSON || '1mb',
      urlencoded: env.SECURITY_BODY_LIMIT_URLENCODED || '1mb',
    },
    
    trustProxy: env.SECURITY_TRUST_PROXY 
      ? (env.SECURITY_TRUST_PROXY === 'true' || env.SECURITY_TRUST_PROXY === '1')
        ? true
        : parseNumber(env.SECURITY_TRUST_PROXY, 0) || env.SECURITY_TRUST_PROXY
      : false,
  };
}

/**
 * Get default security configuration for development
 */
export function getDefaultDevSecurityConfig(): Partial<SecurityConfig> {
  return {
    enabled: true,
    rateLimit: {
      enabled: false, // Disabled in dev
      maxRequests: 1000,
      windowMinutes: 15,
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: false, // Disabled in dev for easier debugging
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: false, // Disabled in dev (only useful with HTTPS)
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
      xssFilter: true,
    },
    cors: {
      enabled: true,
      origins: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: false,
    },
    sanitization: {
      noSqlInjection: true,
      hpp: true,
    },
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024,
    },
    trustProxy: false,
  };
}

/**
 * Get default security configuration for production
 */
export function getDefaultProdSecurityConfig(): Partial<SecurityConfig> {
  return {
    enabled: true,
    rateLimit: {
      enabled: true,
      maxRequests: 100, // Stricter in production
      windowMinutes: 15,
      message: 'Too many requests from this IP, please try again later.',
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: true, // Enabled in production
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: true, // Enabled in production (requires HTTPS)
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
      xssFilter: true,
    },
    cors: {
      enabled: true,
      origins: process.env.ALLOWED_ORIGINS || 'https://yourdomain.com',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
    sanitization: {
      noSqlInjection: true,
      hpp: true,
    },
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024,
    },
    trustProxy: true, // Usually behind a load balancer in production
  };
}
