const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const { config } = require('../src/config/env');

const token = jwt.sign({ userId: 1, role: 'client' }, config.jwtSecret, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${token}` };

describe('Validation des entrées (Zod)', () => {
  it('rejette une inscription avec email invalide', async () => {
    const res = await request(app).post('/api/auth/register').send({
      first_name: 'Jean',
      last_name: 'Test',
      email: 'pas-un-email',
      phone: '+2250700000000',
      password: 'secret1',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Validation/i);
    expect(res.body.details.some((d) => d.field === 'email')).toBe(true);
  });

  it('rejette une inscription avec une coordonnée GPS incomplète', async () => {
    const res = await request(app).post('/api/auth/register').send({
      first_name: 'Jean',
      last_name: 'Test',
      email: 'jean.prestataire@example.com',
      phone: '+2250700000001',
      password: 'secret1',
      role: 'provider',
      latitude: 5.3484,
    });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'latitude')).toBe(true);
  });

  it('rejette un login sans mot de passe', async () => {
    const res = await request(app).post('/api/auth/login').send({ login: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'password')).toBe(true);
  });

  it('rejette une demande sans description', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set(auth)
      .send({ category_id: 1, title: 'Panne' });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'description')).toBe(true);
  });

  it('rejette un identifiant de demande non numérique', async () => {
    const res = await request(app).get('/api/requests/abc').set(auth);

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'id')).toBe(true);
  });

  it('rejette un moyen de paiement inconnu', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set(auth)
      .send({ request_id: 1, amount: 5000, payment_method: 'bitcoin' });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'payment_method')).toBe(true);
  });

  it('rejette une note hors barème', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set(auth)
      .send({ request_id: 1, rating: 9 });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'rating')).toBe(true);
  });

  it('rejette un identifiant de prestataire invalide dans l’URL', async () => {
    const res = await request(app).get('/api/reviews/provider/abc');

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.field === 'providerId')).toBe(true);
  });
});
