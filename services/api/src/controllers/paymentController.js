const db = require('../config/db');
const { config } = require('../config/env');
const logger = require('../config/logger');
const { resolveProvider, getProvider } = require('../services/payments');

const REUSABLE_STATUSES = ['pending', 'processing'];

async function initiatePayment(req, res) {
  try {
    if (!config.payments.enabled) {
      return res.status(503).json({
        error: 'Paiement indisponible',
        message: 'Le paiement en ligne n’est pas encore activé.',
      });
    }

    const transactionId = req.params.id;
    const userId = req.user.userId;

    const txRes = await db.query(
      `SELECT t.*, sp.user_id AS provider_user_id
       FROM transactions t
       JOIN service_providers sp ON sp.id = t.provider_id
       WHERE t.id = $1`,
      [transactionId]
    );

    const transaction = txRes.rows[0];
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction introuvable' });
    }

    if (Number(transaction.client_id) !== Number(userId)) {
      return res.status(403).json({ error: 'Vous ne pouvez payer que vos propres transactions' });
    }

    if (transaction.payment_status !== 'pending') {
      return res.status(400).json({
        error: 'Transaction déjà traitée',
        message: `Cette transaction est au statut « ${transaction.payment_status} ».`,
      });
    }

    const provider = resolveProvider(transaction.payment_method);
    if (!provider) {
      return res.status(400).json({ error: 'Moyen de paiement non pris en charge' });
    }

    if (!provider.isConfigured()) {
      return res.status(503).json({
        error: 'Moyen de paiement indisponible',
        message: 'Ce moyen de paiement n’est pas encore configuré.',
      });
    }

    const existing = await db.query(
      `SELECT * FROM payment_intents
       WHERE transaction_id = $1
         AND provider = $2
         AND status = ANY($3)
         AND created_at > NOW() - INTERVAL '30 minutes'
       ORDER BY created_at DESC
       LIMIT 1`,
      [transactionId, provider.name, REUSABLE_STATUSES]
    );

    if (existing.rows[0]) {
      return res.json({
        message: 'Paiement déjà initié',
        payment_intent: existing.rows[0],
        checkout_url: existing.rows[0].checkout_url,
        reused: true,
      });
    }

    const idempotencyKey = `tx-${transactionId}-${provider.name}-${Date.now()}`;

    const intentRes = await db.query(
      `INSERT INTO payment_intents (transaction_id, provider, amount, currency, status, idempotency_key)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [transactionId, provider.name, transaction.amount, transaction.currency || 'XOF', idempotencyKey]
    );
    const intent = intentRes.rows[0];

    try {
      const checkout = await provider.createCheckout({
        transaction,
        intent,
        idempotencyKey,
      });

      const updated = await db.query(
        `UPDATE payment_intents
         SET provider_reference = $1, checkout_url = $2, status = $3, metadata = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          checkout.providerReference || null,
          checkout.checkoutUrl || null,
          checkout.status || 'pending',
          checkout.metadata ? JSON.stringify(checkout.metadata) : null,
          intent.id,
        ]
      );

      return res.status(201).json({
        message:
          provider.name === 'cash'
            ? 'Paiement en espèces enregistré. Il sera confirmé après réception.'
            : 'Paiement initié. Complétez le règlement auprès du fournisseur.',
        payment_intent: updated.rows[0],
        checkout_url: updated.rows[0].checkout_url,
      });
    } catch (providerError) {
      await db.query(
        "UPDATE payment_intents SET status = 'failed', updated_at = NOW() WHERE id = $1",
        [intent.id]
      );
      logger.warn({ err: providerError, transactionId, provider: provider.name }, 'Initiation paiement échouée');
      return res.status(502).json({
        error: 'Paiement indisponible',
        message: 'Impossible d’initier le paiement auprès du fournisseur. Réessayez plus tard.',
      });
    }
  } catch (error) {
    logger.error({ err: error }, 'Erreur initiatePayment');
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getPaymentStatus(req, res) {
  try {
    const transactionId = req.params.id;
    const userId = req.user.userId;
    const role = req.user.role;

    const txRes = await db.query(
      `SELECT t.id, t.client_id, t.amount, t.currency, t.payment_method, t.payment_status,
              sp.user_id AS provider_user_id
       FROM transactions t
       JOIN service_providers sp ON sp.id = t.provider_id
       WHERE t.id = $1`,
      [transactionId]
    );

    const transaction = txRes.rows[0];
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction introuvable' });
    }

    const isOwner = Number(transaction.client_id) === Number(userId);
    const isProvider = Number(transaction.provider_user_id) === Number(userId);
    const isAdmin = role === 'admin' || role === 'moderator';

    if (!isOwner && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const intentRes = await db.query(
      `SELECT id, provider, status, amount, currency, checkout_url, created_at, updated_at
       FROM payment_intents
       WHERE transaction_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [transactionId]
    );

    return res.json({
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_method: transaction.payment_method,
        payment_status: transaction.payment_status,
      },
      payment_intent: intentRes.rows[0] || null,
    });
  } catch (error) {
    logger.error({ err: error }, 'Erreur getPaymentStatus');
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function handleWebhook(req, res) {
  const providerName = req.params.provider;
  const provider = getProvider(providerName);

  if (!provider || providerName === 'cash') {
    return res.status(404).json({ error: 'Fournisseur inconnu' });
  }

  if (!provider.verifyWebhook(req)) {
    return res.status(401).json({ error: 'Signature invalide' });
  }

  let payload;
  try {
    payload = JSON.parse(req.rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Corps JSON invalide' });
  }

  const parsed = provider.parseWebhook(payload);
  if (!parsed || !parsed.eventId) {
    return res.status(400).json({ error: 'Événement invalide' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const eventInsert = await client.query(
      `INSERT INTO payment_events (provider, event_id, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING id`,
      [providerName, parsed.eventId, payload]
    );

    if (eventInsert.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ received: true, duplicate: true });
    }

    const eventRowId = eventInsert.rows[0].id;

    let intent = null;
    if (parsed.providerReference) {
      const intentRes = await client.query(
        `SELECT * FROM payment_intents
         WHERE provider = $1 AND provider_reference = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [providerName, parsed.providerReference]
      );
      intent = intentRes.rows[0] || null;
    }

    if (!intent && payload?.metadata?.transaction_id) {
      const intentRes = await client.query(
        `SELECT * FROM payment_intents
         WHERE transaction_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [payload.metadata.transaction_id]
      );
      intent = intentRes.rows[0] || null;
    }

    if (!intent) {
      await client.query('COMMIT');
      logger.warn({ provider: providerName, eventId: parsed.eventId }, 'Webhook sans intention associée');
      return res.status(202).json({ received: true, matched: false });
    }

    await client.query(
      'UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE id = $2',
      [parsed.status, intent.id]
    );

    if (parsed.status === 'succeeded') {
      await client.query(
        `UPDATE transactions
         SET payment_status = 'completed',
             external_transaction_id = COALESCE($1, external_transaction_id),
             updated_at = NOW()
         WHERE id = $2 AND payment_status = 'pending'`,
        [parsed.providerReference || null, intent.transaction_id]
      );
    } else if (parsed.status === 'failed' || parsed.status === 'expired') {
      await client.query(
        `UPDATE transactions
         SET payment_status = 'failed', updated_at = NOW()
         WHERE id = $1 AND payment_status = 'pending'`,
        [intent.transaction_id]
      );
    } else if (parsed.status === 'refunded') {
      await client.query(
        "UPDATE transactions SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1",
        [intent.transaction_id]
      );
    }

    await client.query('UPDATE payment_events SET intent_id = $1 WHERE id = $2', [
      intent.id,
      eventRowId,
    ]);

    await client.query('COMMIT');
    return res.json({ received: true, matched: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err: error, provider: providerName }, 'Erreur traitement webhook paiement');
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
}

module.exports = { initiatePayment, getPaymentStatus, handleWebhook };
