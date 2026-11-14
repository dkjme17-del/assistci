const db = require('../config/db');

const PAYMENT_METHODS = ['wave', 'orange_money', 'mtn_momo', 'moov_money', 'cash', 'card'];

// Le client initie le paiement d'une intervention (Mobile Money, cash, carte)
async function createTransaction(req, res) {
  try {
    const clientId = req.user.userId;
    const { request_id, amount, payment_method, transaction_reference } = req.body;

    if (!request_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'La demande, le montant et le moyen de paiement sont obligatoires' });
    }

    if (!PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({ error: `Moyen de paiement invalide. Autorisés : ${PAYMENT_METHODS.join(', ')}` });
    }

    const reqRes = await db.query(
      'SELECT id, client_id, assigned_provider_id FROM service_requests WHERE id = $1',
      [request_id]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const serviceRequest = reqRes.rows[0];

    if (serviceRequest.client_id !== clientId) {
      return res.status(403).json({ error: 'Vous ne pouvez payer que vos propres demandes' });
    }

    if (!serviceRequest.assigned_provider_id) {
      return res.status(400).json({ error: 'Aucun prestataire assigné à cette demande' });
    }

    const insertRes = await db.query(
      `INSERT INTO transactions (request_id, client_id, provider_id, amount, currency, payment_method, payment_status, transaction_reference)
       VALUES ($1, $2, $3, $4, 'XOF', $5, 'pending', $6)
       RETURNING *`,
      [request_id, clientId, serviceRequest.assigned_provider_id, amount, payment_method, transaction_reference || null]
    );

    return res.status(201).json({
      message: 'Transaction initiée. En attente de confirmation du paiement.',
      transaction: insertRes.rows[0],
    });
  } catch (error) {
    console.error('Erreur createTransaction:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de la transaction' });
  }
}

// Historique des transactions de l'utilisateur connecté
async function getMyTransactions(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let result;
    if (role === 'provider') {
      result = await db.query(
        `SELECT t.* FROM transactions t
         JOIN service_providers sp ON t.provider_id = sp.id
         WHERE sp.user_id = $1
         ORDER BY t.created_at DESC
         LIMIT 100`,
        [userId]
      );
    } else {
      result = await db.query(
        'SELECT * FROM transactions WHERE client_id = $1 ORDER BY created_at DESC LIMIT 100',
        [userId]
      );
    }

    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur getMyTransactions:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des transactions' });
  }
}

// Mise à jour du statut d'une transaction (confirmation / échec / remboursement)
async function updateTransactionStatus(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { payment_status } = req.body;

    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({ error: `Statut invalide. Autorisés : ${validStatuses.join(', ')}` });
    }

    const ownerRes = await db.query(
      'SELECT client_id, payment_status FROM transactions WHERE id = $1',
      [id]
    );
    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction introuvable' });
    }

    const transaction = ownerRes.rows[0];
    const isAdmin = req.user.role === 'admin';
    const isOwner = Number(transaction.client_id) === Number(userId);

    // Un client ne peut qu'annuler son propre paiement en attente.
    // La confirmation et le remboursement sont réservés à l'administration
    // (ou à un futur webhook de passerelle de paiement).
    if (!isAdmin) {
      if (!isOwner || payment_status !== 'failed') {
        return res.status(403).json({
          error: 'Action non autorisée',
          message: 'Seul un administrateur peut confirmer ou rembourser un paiement.',
        });
      }
      if (transaction.payment_status !== 'pending') {
        return res.status(400).json({ error: 'Seule une transaction en attente peut être annulée' });
      }
    }

    const result = await db.query(
      'UPDATE transactions SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [payment_status, id]
    );

    return res.json({ message: `Statut de paiement : ${payment_status}`, transaction: result.rows[0] });
  } catch (error) {
    console.error('Erreur updateTransactionStatus:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la transaction' });
  }
}

module.exports = {
  createTransaction,
  getMyTransactions,
  updateTransactionStatus,
};
