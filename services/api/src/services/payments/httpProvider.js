const { config } = require('../../config/env');
const { verifyHmacSignature } = require('./signature');

// Passerelle Mobile Money générique (agrégateur Orange/MTN/Moov).
// Contrat : POST {url} -> { id, checkout_url } ; webhook -> { event_id, reference, status }.
const NAME = 'http';

function isConfigured() {
  return Boolean(config.payments.http.url);
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['succeeded', 'success', 'paid', 'completed'].includes(value)) return 'succeeded';
  if (['failed', 'declined', 'cancelled', 'canceled', 'error'].includes(value)) return 'failed';
  if (['expired'].includes(value)) return 'expired';
  if (['refunded'].includes(value)) return 'refunded';
  if (['processing'].includes(value)) return 'processing';
  return 'pending';
}

async function createCheckout({ transaction, idempotencyKey }) {
  const response = await fetch(config.payments.http.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.payments.http.token
        ? { Authorization: `Bearer ${config.payments.http.token}` }
        : {}),
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      amount: Number(transaction.amount),
      currency: transaction.currency || 'XOF',
      reference: String(transaction.id),
      payment_method: transaction.payment_method,
      callback_url: `${config.appUrl}/api/payments/webhook/http`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Passerelle paiement (${response.status}) ${detail}`);
  }

  const data = await response.json();
  return {
    providerReference: data.id || data.reference || null,
    checkoutUrl: data.checkout_url || data.payment_url || null,
    status: normalizeStatus(data.status),
    metadata: { gateway: data.id || null },
  };
}

function verifyWebhook(req) {
  const rawBody = req.rawBody || Buffer.from('');
  return verifyHmacSignature(
    rawBody,
    config.payments.http.webhookSecret,
    req.headers['x-payment-signature']
  );
}

function parseWebhook(payload) {
  return {
    eventId: payload?.event_id || payload?.id || null,
    providerReference: payload?.reference || payload?.intent_id || null,
    status: normalizeStatus(payload?.status),
  };
}

module.exports = { name: NAME, isConfigured, createCheckout, verifyWebhook, parseWebhook };
