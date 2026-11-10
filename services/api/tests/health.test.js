const request = require('supertest');
const app = require('../src/server');
const { config } = require('../src/config/env');

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

  it('désactive explicitement les téléversements en mode démo', async () => {
    const uploadsEnabled = config.fileUploadsEnabled;
    config.fileUploadsEnabled = false;

    try {
      const [imageResponse, kycResponse] = await Promise.all([
        request(app).post('/api/uploads/image'),
        request(app).post('/api/kyc/upload'),
      ]);

      expect(imageResponse.status).toBe(503);
      expect(imageResponse.body.message).toMatch(/version démo/i);
      expect(kycResponse.status).toBe(503);
      expect(kycResponse.body.message).toMatch(/version démo/i);
    } finally {
      config.fileUploadsEnabled = uploadsEnabled;
    }
  });
});
