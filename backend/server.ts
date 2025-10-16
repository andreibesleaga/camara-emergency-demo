import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { loadConfig } from './utils/config';
import { loadSecurityConfig } from './config/security';
import { applySecurityMiddleware } from './middleware/security';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { CamaraError } from './models/errors';
import locationRouter from './routes/location';
import densityRouter from './routes/density';
import alertsRouter from './routes/alerts';
import routingRouter from './routes/routing';
import mcpRouter from './routes/mcp';

dotenv.config();
const cfg = loadConfig();
const securityCfg = loadSecurityConfig();

const app = express();

// Apply security middleware (helmet, rate limiting, CORS, sanitization, compression)
applySecurityMiddleware(app, securityCfg);

// Body parser with configured limits
app.use(express.json({ limit: securityCfg.bodyLimits.json }));
app.use(express.urlencoded({ extended: true, limit: securityCfg.bodyLimits.urlencoded }));

// Request logging middleware
app.use(requestLoggerMiddleware);

// CAMARA x-correlator header middleware
app.use((req, res, next) => {
  const correlator = req.headers['x-correlator'] as string | undefined;
  if (correlator) {
    // Validate pattern: ^[a-zA-Z0-9-_:;.\/<>{}]{0,256}$
    if (!/^[a-zA-Z0-9-_:;.\/<>{}]{0,256}$/.test(correlator)) {
      return res.status(400).json({
        status: 400,
        code: 'INVALID_ARGUMENT',
        message: 'x-correlator header does not match required pattern',
      });
    }
    res.setHeader('x-correlator', correlator);
  }
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, useMock: cfg.useMock }));

app.use('/api/location', locationRouter);
app.use('/api/density', densityRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/routing', routingRouter);
app.use('/api/mcp', mcpRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof CamaraError) {
    return res.status(err.status).json(err.toJSON());
  }
  logger.error('Unhandled error', err);
  res.status(500).json({
    status: 500,
    code: 'INTERNAL',
    message: 'An internal server error occurred',
  });
});

const distDir = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => logger.info(`Server running on :${port} (mock=${cfg.useMock})`));
