const db = require('../config/db');

// Notifications de l'utilisateur connecté
async function getMyNotifications(req, res) {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      `SELECT id, title, message, type, link, is_read, metadata, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );

    const unreadRes = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadRes.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Erreur getMyNotifications:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
}

// Marquer une notification comme lue
async function markAsRead(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id, is_read',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification introuvable' });
    }

    return res.json({ message: 'Notification marquée comme lue', notification: result.rows[0] });
  } catch (error) {
    console.error('Erreur markAsRead:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la notification' });
  }
}

// Marquer toutes les notifications comme lues
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return res.json({ message: 'Toutes les notifications ont été marquées comme lues', updated: result.rowCount });
  } catch (error) {
    console.error('Erreur markAllAsRead:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications' });
  }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
