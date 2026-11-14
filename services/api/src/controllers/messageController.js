const db = require('../config/db');
const { getRequestAccess } = require('../services/requestAccess');

function canChat(access) {
  return access.allowed && (access.isAdmin || access.isClientOwner || access.isAssignedProvider);
}

// Récupérer les messages d'une demande (participants uniquement)
async function getMessages(req, res) {
  try {
    const { id: requestId } = req.params;

    const access = await getRequestAccess(req.user, requestId);
    if (!access.request) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }
    if (!canChat(access)) {
      return res.status(403).json({ error: 'Accès refusé à cette conversation' });
    }

    const messagesRes = await db.query(
      `SELECT 
        m.id,
        m.request_id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.is_read,
        m.created_at,
        u.first_name AS sender_name,
        u.role AS sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.request_id = $1
       ORDER BY m.created_at ASC`,
      [requestId]
    );

    return res.json(messagesRes.rows);
  } catch (error) {
    console.error('Erreur getMessages:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
}

// Envoyer un message dans le chat d'une intervention
async function sendMessage(req, res) {
  try {
    const senderId = req.user.userId;
    const { id: requestId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le contenu du message ne peut pas être vide' });
    }
    if (content.trim().length > 2000) {
      return res.status(400).json({ error: 'Le message ne peut pas dépasser 2000 caractères' });
    }

    const access = await getRequestAccess(req.user, requestId);
    if (!access.request) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }
    if (!canChat(access)) {
      return res.status(403).json({ error: 'Accès refusé à cette conversation' });
    }

    const { request } = access;
    let receiverId;

    if (access.isClientOwner || access.isAdmin) {
      if (!request.assigned_provider_id) {
        return res.status(400).json({
          error: 'Aucun prestataire assigné',
          message: 'La conversation sera disponible après acceptation d’un devis.',
        });
      }
      const providerUserRes = await db.query(
        'SELECT user_id FROM service_providers WHERE id = $1',
        [request.assigned_provider_id]
      );
      receiverId = providerUserRes.rows[0]?.user_id;
      if (!receiverId) {
        return res.status(400).json({ error: 'Prestataire introuvable' });
      }
    } else {
      // Prestataire assigné : le destinataire est le client
      receiverId = request.client_id;
    }

    const insertRes = await db.query(
      `INSERT INTO messages (request_id, sender_id, receiver_id, content, is_read)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [requestId, senderId, receiverId, content.trim()]
    );

    const newMsg = insertRes.rows[0];

    const userRes = await db.query('SELECT first_name, role FROM users WHERE id = $1', [senderId]);
    newMsg.sender_name = userRes.rows[0]?.first_name || 'Utilisateur';
    newMsg.sender_role = userRes.rows[0]?.role || 'client';

    return res.status(201).json(newMsg);
  } catch (error) {
    console.error('Erreur sendMessage:', error);
    return res.status(500).json({ error: 'Erreur lors de l’envoi du message' });
  }
}

// Marquer comme lus les messages reçus dans une conversation
async function markMessagesRead(req, res) {
  try {
    const userId = req.user.userId;
    const { id: requestId } = req.params;

    const access = await getRequestAccess(req.user, requestId);
    if (!access.request) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }
    if (!canChat(access)) {
      return res.status(403).json({ error: 'Accès refusé à cette conversation' });
    }

    const result = await db.query(
      `UPDATE messages
       SET is_read = true
       WHERE request_id = $1 AND receiver_id = $2 AND is_read = false
       RETURNING id`,
      [requestId, userId]
    );

    return res.json({ updated: result.rows.length });
  } catch (error) {
    console.error('Erreur markMessagesRead:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour des messages' });
  }
}

module.exports = {
  getMessages,
  sendMessage,
  markMessagesRead,
};
