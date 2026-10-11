const request = require('supertest');
const app = require('../src/server');
const { pool } = require('../src/config/db');

const unique = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const client = {
  first_name: 'Test',
  last_name: 'Client',
  email: `test_client_${unique}@assistci.ci`,
  phone: `+22507${unique.slice(-8)}`,
  password: 'Password123!',
  role: 'client',
};

let token;
let dbAvailable = true;

beforeAll(async () => {
  try {
    await pool.query('SELECT 1');
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  await pool.end();
});

describe('Validation d’inscription', () => {
  it('rejette une inscription avec champs manquants (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@y.z', password: 'Password123!' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Parcours d’authentification', () => {
  it('inscrit un client, connecte et retourne /me', async () => {
    if (!dbAvailable) return;

    const reg = await request(app).post('/api/auth/register').send(client);
    expect(reg.status).toBe(201);
    expect(reg.body).toHaveProperty('token');
    expect(reg.body.user.role).toBe('client');

    token = reg.body.token;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ login: client.email, password: client.password });
    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('token');

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(client.email);
  });

  it('refuse l’accès sans token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('interdit /api/admin aux non-admins (403)', async () => {
    if (!dbAvailable || !token) return;

    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejette un login avec mauvais mot de passe (401)', async () => {
    if (!dbAvailable) return;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: client.email, password: 'mauvais_mot_de_passe' });
    expect(res.status).toBe(401);
  });
});
