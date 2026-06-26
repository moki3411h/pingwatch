process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');

const uniqueEmail = () => `monitor_test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;

let token;
let token2;
let monitorId;
const email1 = uniqueEmail();
const email2 = uniqueEmail();

beforeAll(async () => {
  // Register two users to test IDOR protection
  const res1 = await request(app)
    .post('/api/auth/register')
    .send({ name: 'User One', email: email1, password: 'Test@1234' });
  token = res1.body.token;

  const res2 = await request(app)
    .post('/api/auth/register')
    .send({ name: 'User Two', email: email2, password: 'Test@1234' });
  token2 = res2.body.token;
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['monitor_test_%@example.com']);
  await pool.end();
});

describe('POST /api/monitors', () => {
  it('returns 201 and creates a monitor when authenticated', async () => {
    const res = await request(app)
      .post('/api/monitors')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Monitor', url: 'https://example.com', interval_seconds: 60 });

    expect(res.status).toBe(201);
    expect(res.body.monitor).toHaveProperty('id');
    expect(res.body.monitor.url).toBe('https://example.com');
    monitorId = res.body.monitor.id;
  });

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/monitors')
      .send({ name: 'Test Monitor', url: 'https://example.com', interval_seconds: 60 });

    expect(res.status).toBe(401);
  });

  it('returns 400 when URL is missing', async () => {
    const res = await request(app)
      .post('/api/monitors')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No URL Monitor', interval_seconds: 60 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when interval is below minimum (30s)', async () => {
    const res = await request(app)
      .post('/api/monitors')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fast Monitor', url: 'https://example.com', interval_seconds: 10 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/monitors', () => {
  it('returns 200 and a list of monitors for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/monitors')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.monitors)).toBe(true);
    expect(res.body.monitors.length).toBeGreaterThan(0);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/monitors');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/monitors/:id', () => {
  it('returns 200 for the owner', async () => {
    const res = await request(app)
      .get(`/api/monitors/${monitorId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.monitor.id).toBe(monitorId);
  });

  it('returns 404 for a different user (IDOR protection)', async () => {
    const res = await request(app)
      .get(`/api/monitors/${monitorId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/monitors/:id', () => {
  it('returns 200 and updates the monitor', async () => {
    const res = await request(app)
      .patch(`/api/monitors/${monitorId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Monitor Name' });

    expect(res.status).toBe(200);
    expect(res.body.monitor.name).toBe('Updated Monitor Name');
  });

  it('returns 404 when another user tries to update', async () => {
    const res = await request(app)
      .patch(`/api/monitors/${monitorId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/monitors/:id', () => {
  it('returns 404 when another user tries to delete', async () => {
    const res = await request(app)
      .delete(`/api/monitors/${monitorId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(404);
  });

  it('returns 204 when the owner deletes the monitor', async () => {
    const res = await request(app)
      .delete(`/api/monitors/${monitorId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });
});
