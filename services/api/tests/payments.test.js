const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/server');
const {
  verifyHmacSignature,
  verifyWaveSignature,
} = require('../src/services/payments/signature');
const { resolveProvider, isMethodAvailable } = require('../src/services/payments');

describe('Signatures de webhooks de paiement', () => {
  const body = Buffer.from(JSON.stringify({ event_id: 'evt_1', status: 'succeeded' }));

  it('valide une signature HMAC correcte et rejette une signature falsifiée', () => {
    const secret = 'secret_test';
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    expect(verifyHmacSignature(body, secret, signature)).toBe(true);
    expect(verifyHmacSignature(body, secret, 'deadbeef')).toBe(false);
    expect(verifyHmacSignature(body, secret, undefined)).toBe(false);
  });

  it('valide la signature Wave avec horodatage récent', () => {
    const secret = 'wave_secret';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body.toString('utf8')}`)
      .digest('hex');

    expect(verifyWaveSignature(body, `t=${timestamp},v1=${signature}`, secret)).toBe(true);
  });

  it('rejette une signature Wave expirée ou mal formée', () => {
    const secret = 'wave_secret';
    const oldTimestamp = Math.floor(Date.now() / 1000) - 3600;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${oldTimestamp}.${body.toString('utf8')}`)
      .digest('hex');

    expect(verifyWaveSignature(body, `t=${oldTimestamp},v1=${signature}`, secret)).toBe(false);
    expect(verifyWaveSignature(body, 'invalide', secret)).toBe(false);
  });
});

describe('Sélection des fournisseurs de paiement', () => {
  it('associe chaque moyen de paiement à un fournisseur', () => {
    expect(resolveProvider('wave')?.name).toBe('wave');
    expect(resolveProvider('orange_money')?.name).toBe('http');
    expect(resolveProvider('card')?.name).toBe('http');
    expect(resolveProvider('cash')?.name).toBe('cash');
    expect(resolveProvider('inconnu')).toBeNull();
  });

  it('considère le cash comme disponible sans configuration', () => {
    expect(isMethodAvailable('cash')).toBe(true);
  });
});

describe('Webhooks de paiement (HTTP)', () => {
  it('renvoie 404 pour un fournisseur inconnu', async () => {
    const res = await request(app)
      .post('/api/payments/webhook/inconnu')
      .send({ event_id: 'evt_x' });
    expect(res.status).toBe(404);
  });

  it('rejette une signature absente ou invalide', async () => {
    const httpRes = await request(app)
      .post('/api/payments/webhook/http')
      .set('X-Payment-Signature', 'invalide')
      .send({ event_id: 'evt_x', status: 'succeeded' });
    expect(httpRes.status).toBe(401);

    const waveRes = await request(app)
      .post('/api/payments/webhook/wave')
      .set('Wave-Signature', 't=1,v1=invalide')
      .send({ id: 'evt_x', type: 'checkout.session.completed' });
    expect(waveRes.status).toBe(401);
  });
});
