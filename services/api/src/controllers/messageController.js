const db = require('../config/db');

// Récupérer les messages d'une demande
async function getMessages(req, res) {
  try {
    const { id: requestId } = req.params;

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

    // Récupérer la demande pour identifier le destinataire
    const reqRes = await db.query(
      `SELECT sr.client_id, sp.user_id AS provider_user_id
       FROM service_requests sr
       LEFT JOIN service_providers sp ON sr.assigned_provider_id = sp.id
       WHERE sr.id = $1`,
      [requestId]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const { client_id, provider_user_id } = reqRes.rows[0];

    // Déterminer qui est le destinataire
    let receiverId = client_id;
    if (senderId === client_id) {
      receiverId = provider_user_id || client_id; // si pas encore assigné
    }

    const insertRes = await db.query(
      `INSERT INTO messages (request_id, sender_id, receiver_id, content, is_read)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [requestId, senderId, receiverId, content.trim()]
    );

    const newMsg = insertRes.rows[0];

    // Récupérer le nom de l'expéditeur
    const userRes = await db.query('SELECT first_name, role FROM users WHERE id = $1', [senderId]);
    newMsg.sender_name = userRes.rows[0]?.first_name || 'Utilisateur';
    newMsg.sender_role = userRes.rows[0]?.role || 'client';

    return res.status(201).json(newMsg);
  } catch (error) {
    console.error('Erreur sendMessage:', error);
    return res.status(500).json({ error: 'Erreur lors de l’envoi du message' });
  }
}

module.exports = {
  getMessages,
  sendMessage,
};
