const request = require('supertest');
const app = require('../src/server');

describe('GET /api/health', () => {
  it('renvoie un statut ok et la forme attendue', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'assistci-api' });
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('renvoie 404 JSON pour une route inconnue', async () => {
    const res = await request(app).get('/api/inexistant');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
