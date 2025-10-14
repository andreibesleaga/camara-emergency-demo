import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { loadConfig } from './utils/config';
import locationRouter from './routes/location';
import densityRouter from './routes/density';
import alertsRouter from './routes/alerts';
import routingRouter from './routes/routing';
import mcpRouter from './routes/mcp';

dotenv.config();
const cfg = loadConfig();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, useMock: cfg.useMock }));

app.use('/api/location', locationRouter);
app.use('/api/density', densityRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/routing', routingRouter);
app.use('/api/mcp', mcpRouter);

const distDir = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => logger.info(`Server running on :${port} (mock=${cfg.useMock})`));
