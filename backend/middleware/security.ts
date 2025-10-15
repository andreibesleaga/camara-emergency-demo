/**
 * Security middleware setup for CAMARA Emergency Demo
 * 
 * Configures and applies security middleware based on configuration
 */

import { Express, RequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import cors from 'cors';
import { SecurityConfig } from '../config/security';
import logger from '../utils/logger';

/**
 * Apply all security middleware to Express app
 */
export function applySecurityMiddleware(app: Express, config: SecurityConfig): void {
  if (!config.enabled) {
    logger.warn('Security middleware is DISABLED - not recommended for production!');
    return;
  }
  
  logger.info('Applying security middleware...');
  
  // Trust proxy (must be set before other middleware)
  if (config.trustProxy) {
    app.set('trust proxy', config.trustProxy);
    logger.info(`Trust proxy enabled: ${config.trustProxy}`);
  }
  
  // Helmet - Security headers
  if (config.helmet.enabled) {
    app.use(createHelmetMiddleware(config));
    logger.info('Helmet security headers enabled');
  }
  
  // CORS - Cross-Origin Resource Sharing
  if (config.cors.enabled) {
    app.use(createCorsMiddleware(config));
    logger.info(`CORS enabled for origins: ${config.cors.origins}`);
  }
  
  // Rate limiting
  if (config.rateLimit.enabled) {
    app.use(createRateLimitMiddleware(config));
    logger.info(`Rate limiting enabled: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMinutes} minutes`);
  }
  
  // NoSQL injection protection
  if (config.sanitization.noSqlInjection) {
    app.use(mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        logger.warn(`Potential NoSQL injection attempt detected`, { 
          ip: req.ip, 
          key,
          path: req.path 
        });
      },
    }));
    logger.info('NoSQL injection protection enabled');
  }
  
  // HTTP Parameter Pollution protection
  if (config.sanitization.hpp) {
    app.use(hpp());
    logger.info('HTTP Parameter Pollution protection enabled');
  }
  
  // Compression
  if (config.compression.enabled) {
    app.use(compression({
      level: config.compression.level,
      threshold: config.compression.threshold,
      filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use compression filter
        return compression.filter(req, res);
      },
    }));
    logger.info(`Response compression enabled (level: ${config.compression.level}, threshold: ${config.compression.threshold})`);
  }
  
  logger.info('Security middleware applied successfully');
}

/**
 * Create Helmet middleware with configuration
 */
function createHelmetMiddleware(config: SecurityConfig): RequestHandler {
  const helmetConfig: any = {};
  
  if (!config.helmet.contentSecurityPolicy) {
    helmetConfig.contentSecurityPolicy = false;
  } else {
    // Default CSP for CAMARA Emergency Demo
    helmetConfig.contentSecurityPolicy = {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for React in dev
        styleSrc: ["'self'", "'unsafe-inline'"], // Needed for inline styles
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    };
  }
  
  if (!config.helmet.dnsPrefetchControl) {
    helmetConfig.dnsPrefetchControl = false;
  }
  
  if (!config.helmet.frameguard) {
    helmetConfig.frameguard = false;
  }
  
  if (!config.helmet.hidePoweredBy) {
    helmetConfig.hidePoweredBy = false;
  }
  
  if (!config.helmet.hsts) {
    helmetConfig.hsts = false;
  } else {
    helmetConfig.hsts = {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    };
  }
  
  if (!config.helmet.ieNoOpen) {
    helmetConfig.ieNoOpen = false;
  }
  
  if (!config.helmet.noSniff) {
    helmetConfig.noSniff = false;
  }
  
  if (!config.helmet.permittedCrossDomainPolicies) {
    helmetConfig.permittedCrossDomainPolicies = false;
  }
  
  if (!config.helmet.referrerPolicy) {
    helmetConfig.referrerPolicy = false;
  } else {
    helmetConfig.referrerPolicy = {
      policy: 'strict-origin-when-cross-origin',
    };
  }
  
  if (!config.helmet.xssFilter) {
    helmetConfig.xssFilter = false;
  }
  
  return helmet(helmetConfig);
}

/**
 * Create CORS middleware with configuration
 */
function createCorsMiddleware(config: SecurityConfig): RequestHandler {
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is allowed
      const allowedOrigins = config.cors.origins;
      
      if (allowedOrigins === '*') {
        return callback(null, true);
      }
      
      const origins = allowedOrigins.split(',').map(o => o.trim());
      
      if (origins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check for wildcard patterns (e.g., *.example.com)
      const wildcardMatch = origins.some(allowed => {
        if (allowed.startsWith('*.')) {
          const domain = allowed.slice(2);
          return origin.endsWith(domain);
        }
        return false;
      });
      
      if (wildcardMatch) {
        return callback(null, true);
      }
      
      logger.warn(`CORS: Origin not allowed`, { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    },
    methods: config.cors.methods,
    credentials: config.cors.credentials,
    optionsSuccessStatus: 200,
  };
  
  return cors(corsOptions);
}

/**
 * Create rate limit middleware with configuration
 */
function createRateLimitMiddleware(config: SecurityConfig): RequestHandler {
  const skipIps = new Set(config.rateLimit.skipIps || []);
  
  return rateLimit({
    windowMs: config.rateLimit.windowMinutes * 60 * 1000,
    max: config.rateLimit.maxRequests,
    message: {
      status: 429,
      code: 'TOO_MANY_REQUESTS',
      message: config.rateLimit.message || 'Too many requests, please try again later.',
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for whitelisted IPs
      const clientIp = req.ip;
      if (clientIp && skipIps.has(clientIp)) {
        return true;
      }
      return false;
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { 
        ip: req.ip, 
        path: req.path,
        method: req.method,
      });
      res.status(429).json({
        status: 429,
        code: 'TOO_MANY_REQUESTS',
        message: config.rateLimit.message || 'Too many requests, please try again later.',
      });
    },
    // Use in-memory store (for production, consider using Redis)
    store: undefined, // Uses default MemoryStore
  });
}

/**
 * Create API-specific rate limiter (stricter limits for sensitive endpoints)
 */
export function createApiRateLimiter(options: {
  maxRequests?: number;
  windowMinutes?: number;
  message?: string;
}): RequestHandler {
  return rateLimit({
    windowMs: (options.windowMinutes || 15) * 60 * 1000,
    max: options.maxRequests || 50,
    message: {
      status: 429,
      code: 'TOO_MANY_REQUESTS',
      message: options.message || 'Too many API requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('API rate limit exceeded', { 
        ip: req.ip, 
        path: req.path,
        method: req.method,
      });
      res.status(429).json({
        status: 429,
        code: 'TOO_MANY_REQUESTS',
        message: options.message || 'Too many API requests, please try again later.',
      });
    },
  });
}
