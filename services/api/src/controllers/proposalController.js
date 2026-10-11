const db = require('../config/db');
const { notify } = require('../services/notificationService');

// Un prestataire soumet une proposition / devis chiffré
async function createProposal(req, res) {
  try {
    const userId = req.user.userId;
    const { id: requestId } = req.params;
    const { proposed_price, estimated_arrival_minutes, message } = req.body;

    if (!proposed_price) {
      return res.status(400).json({ error: 'Le prix proposé est obligatoire' });
    }

    // Récupérer l'ID prestataire associé à cet utilisateur
    const providerRes = await db.query(
      'SELECT id FROM service_providers WHERE user_id = $1',
      [userId]
    );

    if (providerRes.rows.length === 0) {
      return res.status(403).json({
        error: 'Profil prestataire non trouvé',
        message: 'Vous devez avoir un profil prestataire actif pour soumettre un devis',
      });
    }

    const providerId = providerRes.rows[0].id;

    // Insertion du devis
    const proposalRes = await db.query(
      `INSERT INTO request_proposals (request_id, provider_id, proposed_price, estimated_arrival_minutes, message, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [requestId, providerId, proposed_price, estimated_arrival_minutes || 30, message || '']
    );

    // Mettre à jour le statut de la demande si elle était en attente
    const reqOwnerRes = await db.query(
      `UPDATE service_requests SET status = 'proposal_received', updated_at = NOW()
       WHERE id = $1 AND status IN ('created', 'matching')
       RETURNING client_id, title`,
      [requestId]
    );

    // Notifier le client de la réception d'un devis
    if (reqOwnerRes.rows.length > 0) {
      await notify({
        userId: reqOwnerRes.rows[0].client_id,
        title: 'Nouveau devis reçu',
        message: `Un prestataire a proposé ${proposed_price} FCFA pour votre demande "${reqOwnerRes.rows[0].title}".`,
        type: 'proposal_received',
        link: `/requests/${requestId}`,
        metadata: { request_id: Number(requestId), proposal_id: proposalRes.rows[0].id },
      });
    }

    return res.status(201).json({
      message: 'Proposition de devis transmise au client avec succès',
      proposal: proposalRes.rows[0],
    });
  } catch (error) {
    console.error('Erreur createProposal:', error);
    return res.status(500).json({ error: 'Erreur lors de l’envoi de la proposition' });
  }
}

// Le client accepte une proposition
async function acceptProposal(req, res) {
  try {
    const clientId = req.user.userId;
    const { proposalId } = req.params;

    // Récupérer la proposition et vérifier que la demande appartient au client
    const propRes = await db.query(
      `SELECT rp.*, sr.client_id, sr.id AS req_id
       FROM request_proposals rp
       JOIN service_requests sr ON rp.request_id = sr.id
       WHERE rp.id = $1`,
      [proposalId]
    );

    if (propRes.rows.length === 0) {
      return res.status(404).json({ error: 'Proposition introuvable' });
    }

    const proposal = propRes.rows[0];

    if (proposal.client_id !== clientId) {
      return res.status(403).json({ error: 'Action non autorisée sur cette demande' });
    }

    // Valider la proposition
    await db.query("UPDATE request_proposals SET status = 'accepted' WHERE id = $1", [proposalId]);

    // Décliner les autres propositions
    await db.query(
      "UPDATE request_proposals SET status = 'declined' WHERE request_id = $1 AND id != $2",
      [proposal.req_id, proposalId]
    );

    // Assigner le prestataire à la demande
    await db.query(
      "UPDATE service_requests SET status = 'accepted', assigned_provider_id = $1, updated_at = NOW() WHERE id = $2",
      [proposal.provider_id, proposal.req_id]
    );

    // Notifier le prestataire que son devis est accepté
    const providerUserRes = await db.query(
      'SELECT user_id FROM service_providers WHERE id = $1',
      [proposal.provider_id]
    );
    if (providerUserRes.rows.length > 0) {
      await notify({
        userId: providerUserRes.rows[0].user_id,
        title: 'Devis accepté',
        message: 'Le client a accepté votre devis. Vous pouvez démarrer l’intervention.',
        type: 'proposal_accepted',
        link: `/requests/${proposal.req_id}`,
        metadata: { request_id: proposal.req_id },
      });
    }

    return res.json({
      message: 'Proposition acceptée. Le dépanneur a été notifié de votre confirmation.',
      request_id: proposal.req_id,
      assigned_provider_id: proposal.provider_id,
    });
  } catch (error) {
    console.error('Erreur acceptProposal:', error);
    return res.status(500).json({ error: 'Erreur lors de l’acceptation de la proposition' });
  }
}

// Mettre à jour l'état d'avancement de l'intervention (ex: in_progress, completed, cancelled)
async function updateRequestStatus(req, res) {
  try {
    const userId = req.user.userId;
    const { id: requestId } = req.params;
    const { status, cancellation_reason } = req.body;

    const validStatuses = ['accepted', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Autorisés : ${validStatuses.join(', ')}` });
    }

    // Vérifier l'existence de la demande et l'autorisation de l'appelant
    const ownerRes = await db.query(
      `SELECT sr.client_id, sp.user_id AS provider_user_id
       FROM service_requests sr
       LEFT JOIN service_providers sp ON sr.assigned_provider_id = sp.id
       WHERE sr.id = $1`,
      [requestId]
    );

    if (ownerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const { client_id, provider_user_id } = ownerRes.rows[0];
    const isAdmin = req.user.role === 'admin';
    const isClientOwner = req.user.role === 'client' && client_id === userId;
    const isAssignedProvider = req.user.role === 'provider' && provider_user_id === userId;

    if (!isAdmin && !isClientOwner && !isAssignedProvider) {
      return res.status(403).json({
        error: 'Action non autorisée',
        message: 'Seul le client propriétaire, le prestataire assigné ou un administrateur peut modifier cette demande',
      });
    }

    const completedClause = status === 'completed' ? 'NOW()' : 'completed_at';

    const updateRes = await db.query(
      `UPDATE service_requests
       SET status = $1,
           cancellation_reason = $2,
           completed_at = ${completedClause},
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, cancellation_reason || null, requestId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    // Notifier l'autre partie du changement de statut
    const counterpartId = userId === client_id ? provider_user_id : client_id;
    if (counterpartId) {
      await notify({
        userId: counterpartId,
        title: 'Mise à jour de l’intervention',
        message: `Le statut de l’intervention #${requestId} est désormais : ${status}.`,
        type: 'status_changed',
        link: `/requests/${requestId}`,
        metadata: { request_id: Number(requestId), status },
      });
    }

    return res.json({
      message: `Statut mis à jour : ${status}`,
      request: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Erreur updateRequestStatus:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
}

module.exports = {
  createProposal,
  acceptProposal,
  updateRequestStatus,
};

