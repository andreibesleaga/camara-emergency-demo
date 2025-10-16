import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Request logging middleware
 * Logs all incoming HTTP requests with method, path, query params, and response time
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const { method, path, query, body, ip, headers } = req;
  
  // Log incoming request
  const queryString = Object.keys(query).length > 0 ? `?${new URLSearchParams(query as any).toString()}` : '';
  const correlator = headers['x-correlator'] || 'none';
  
  logger.info(`→ ${method} ${path}${queryString} [correlator: ${correlator}] [ip: ${ip}]`);
  
  // Log request body for POST/PUT/PATCH (truncate if too large)
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const bodyStr = JSON.stringify(body);
    const truncatedBody = bodyStr.length > 500 ? bodyStr.substring(0, 500) + '...' : bodyStr;
    logger.info(`  Body: ${truncatedBody}`);
  }

  // Capture original end function
  const originalEnd = res.end;
  
  // Override end to log response
  res.end = function(this: Response, chunk?: any, encoding?: any, callback?: any): any {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusEmoji = statusCode >= 500 ? '🔴' : statusCode >= 400 ? '🟡' : '🟢';
    
    logger.info(`← ${method} ${path} ${statusEmoji} ${statusCode} [${duration}ms]`);
    
    // Call original end
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}
