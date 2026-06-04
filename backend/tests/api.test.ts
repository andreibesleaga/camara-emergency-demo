import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Force mock mode before the app (and its routes) load their config.
process.env.USE_MOCK = 'true';

let app: Express;

beforeAll(async () => {
  app = (await import('../app')).default;
});

describe('camara-emergency-demo API (mock mode)', () => {
  it('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /readyz reports mock mode', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', mode: 'mock' });
  });

  it('GET /api/health returns useMock', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.useMock).toBe(true);
  });

  it('GET /api/location/device/:id returns a location', async () => {
    const res = await request(app).get('/api/location/device/dev-123');
    expect(res.status).toBe(200);
    expect(res.body.location).toBeDefined();
    expect(typeof res.body.location.lat).toBe('number');
    expect(typeof res.body.location.lon).toBe('number');
  });

  it('GET /api/location/device/:id rejects too-short ids', async () => {
    const res = await request(app).get('/api/location/device/ab');
    expect(res.status).toBe(400);
  });

  it('POST /api/density/snapshot (legacy polygon) returns a snapshot', async () => {
    const res = await request(app)
      .post('/api/density/snapshot')
      .send({
        polygon: {
          coordinates: [
            [26.0, 44.4],
            [26.2, 44.4],
            [26.2, 44.5],
            [26.0, 44.5],
          ],
        },
      });
    expect(res.status).toBe(200);
    expect(typeof res.body.totalDevices).toBe('number');
    expect(Array.isArray(res.body.points)).toBe(true);
  });

  it('POST /api/density/snapshot rejects invalid polygon', async () => {
    const res = await request(app).post('/api/density/snapshot').send({ polygon: { nope: 1 } });
    expect(res.status).toBe(400);
  });

  it('GET /api/density/flow/:areaId returns a series', async () => {
    const res = await request(app).get('/api/density/flow/area-1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.series)).toBe(true);
  });

  it('GET /api/alerts/rules returns an array', async () => {
    const res = await request(app).get('/api/alerts/rules');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST + DELETE /api/alerts/rules round-trips a rule', async () => {
    const create = await request(app)
      .post('/api/alerts/rules')
      .send({
        name: 'Test rule',
        polygon: {
          coordinates: [
            [26.0, 44.4],
            [26.2, 44.4],
            [26.2, 44.5],
            [26.0, 44.4],
          ],
        },
        thresholdDevices: 10,
        alertChannels: ['ui'],
      });
    expect(create.status).toBe(200);
    expect(create.body.id).toBeDefined();

    const del = await request(app).delete(`/api/alerts/rules/${create.body.id}`);
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });
  });

  it('POST /api/alerts/rules rejects invalid rule', async () => {
    const res = await request(app).post('/api/alerts/rules').send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('POST /api/routing/plan returns a plan', async () => {
    const res = await request(app)
      .post('/api/routing/plan')
      .send({ from: { lat: 44.42, lon: 26.1 }, to: { lat: 44.45, lon: 26.12 } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.path)).toBe(true);
    expect(typeof res.body.etaMinutes).toBe('number');
  });

  it('POST /api/routing/plan rejects invalid coordinates', async () => {
    const res = await request(app).post('/api/routing/plan').send({ from: {}, to: {} });
    expect(res.status).toBe(400);
  });

  it('POST /api/mcp/invoke routes a known tool', async () => {
    const res = await request(app)
      .post('/api/mcp/invoke')
      .send({ tool: 'planRoute', args: { from: { lat: 44.42, lon: 26.1 }, to: { lat: 44.45, lon: 26.12 } } });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.path)).toBe(true);
  });

  it('POST /api/mcp/invoke rejects unknown tool', async () => {
    const res = await request(app).post('/api/mcp/invoke').send({ tool: 'nope' });
    expect(res.status).toBe(400);
  });

  it('rejects malformed x-correlator header', async () => {
    const res = await request(app).get('/api/alerts/rules').set('x-correlator', 'bad correlator!');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ARGUMENT');
  });
});
