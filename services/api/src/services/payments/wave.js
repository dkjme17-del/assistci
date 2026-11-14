const { config } = require('../../config/env');
const { verifyWaveSignature } = require('./signature');

const NAME = 'wave';

function isConfigured() {
  return Boolean(config.payments.wave.apiKey);
}

async function createCheckout({ transaction, idempotencyKey }) {
  const response = await fetch(`${config.payments.wave.baseUrl}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.payments.wave.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      amount: String(Math.round(Number(transaction.amount))),
      currency: transaction.currency || 'XOF',
      client_reference: String(transaction.id),
      success_url: `${config.appUrl}/payments/success?transaction=${transaction.id}`,
      error_url: `${config.appUrl}/payments/error?transaction=${transaction.id}`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Wave checkout (${response.status}) ${detail}`);
  }

  const data = await response.json();
  return {
    providerReference: data.id || null,
    checkoutUrl: data.wave_launch_url || null,
    status: 'pending',
    metadata: { wave_checkout_id: data.id || null },
  };
}

function verifyWebhook(req) {
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
  return verifyWaveSignature(
    rawBody,
    req.headers['wave-signature'],
    config.payments.wave.webhookSecret
  );
}

function parseWebhook(payload) {
  const type = payload?.type || '';
  const data = payload?.data || {};

  let status = 'processing';
  if (type === 'checkout.session.completed' && data.payment_status === 'succeeded') {
    status = 'succeeded';
  } else if (type === 'checkout.session.payment_failed') {
    status = 'failed';
  } else if (type === 'checkout.session.expired') {
    status = 'expired';
  } else if (type === 'checkout.session.refunded') {
    status = 'refunded';
  }

  return {
    eventId: payload?.id || `${data.id || 'unknown'}:${type}`,
    providerReference: data.id || null,
    status,
  };
}

module.exports = { name: NAME, isConfigured, createCheckout, verifyWebhook, parseWebhook };
