const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/db');
const authTokens = require('../src/services/authTokens');

const unique = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const account = {
  first_name: 'Flux',
  last_name: 'Auth',
  email: `test_flows_${unique}@assistci.ci`,
  phone: `+22505${unique.slice(-8)}`,
  password: 'Password123!',
  role: 'client',
};

let dbAvailable = true;
let userId;
let refreshToken;

beforeAll(async () => {
  try {
    await db.query('SELECT 1');
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  await db.pool.end();
});

describe('Flux d’authentification avancés', () => {
  it('inscrit un compte avec un refresh token', async () => {
    if (!dbAvailable) return;

    const res = await request(app).post('/api/auth/register').send(account);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('refresh_token');

    refreshToken = res.body.refresh_token;

    const found = await db.query('SELECT id FROM users WHERE email = $1', [account.email]);
    userId = found.rows[0].id;
    expect(userId).toBeDefined();
  });

  it('vérifie l’adresse email via un jeton', async () => {
    if (!dbAvailable || !userId) return;

    const token = await authTokens.createEmailVerificationToken(userId);
    const res = await request(app).post('/api/auth/verify-email').send({ token });
    expect(res.status).toBe(200);

    const me = await db.query('SELECT email_verified FROM users WHERE id = $1', [userId]);
    expect(me.rows[0].email_verified).toBe(true);
  });

  it('refuse un jeton de vérification déjà utilisé', async () => {
    if (!dbAvailable || !userId) return;

    const token = await authTokens.createEmailVerificationToken(userId);
    await request(app).post('/api/auth/verify-email').send({ token });
    const res = await request(app).post('/api/auth/verify-email').send({ token });
    expect(res.status).toBe(400);
  });

  it('rafraîchit la session et détecte la réutilisation du jeton', async () => {
    if (!dbAvailable || !refreshToken) return;

    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.refresh_token).not.toBe(refreshToken);

    // L'ancien jeton a été tourné : sa réutilisation doit échouer.
    const replay = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(replay.status).toBe(401);

    refreshToken = res.body.refresh_token;
  });

  it('révoque la session à la déconnexion', async () => {
    if (!dbAvailable || !refreshToken) return;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ login: account.email, password: account.password });
    expect(login.status).toBe(200);

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ refresh_token: login.body.refresh_token });
    expect(logout.status).toBe(200);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: login.body.refresh_token });
    expect(res.status).toBe(401);
  });

  it('réinitialise le mot de passe et invalide les sessions', async () => {
    if (!dbAvailable || !userId) return;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ login: account.email, password: account.password });
    expect(login.status).toBe(200);

    const token = await authTokens.createPasswordResetToken(userId);
    const newPassword = 'NouveauPass123!';
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: newPassword });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ login: account.email, password: account.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ login: account.email, password: newPassword });
    expect(newLogin.status).toBe(200);

    // Les refresh tokens émis avant la réinitialisation sont révoqués.
    const oldRefresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: login.body.refresh_token });
    expect(oldRefresh.status).toBe(401);
  });

  it('répond de façon générique à une demande de réinitialisation', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `inconnu_${unique}@assistci.ci` });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Si un compte correspond/i);
  });
});
