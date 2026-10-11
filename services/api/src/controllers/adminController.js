const db = require('../config/db');

// Statistiques globales de la plateforme
async function getAdminStats(req, res) {
  try {
    const usersCount = await db.query('SELECT COUNT(*) FROM users');
    const providersCount = await db.query('SELECT COUNT(*) FROM service_providers');
    const requestsCount = await db.query('SELECT COUNT(*) FROM service_requests');
    const completedRequestsCount = await db.query("SELECT COUNT(*) FROM service_requests WHERE status = 'completed'");
    const pendingKycCount = await db.query("SELECT COUNT(*) FROM kyc_documents WHERE status = 'pending'");

    return res.json({
      total_users: parseInt(usersCount.rows[0].count, 10),
      total_providers: parseInt(providersCount.rows[0].count, 10),
      total_requests: parseInt(requestsCount.rows[0].count, 10),
      completed_requests: parseInt(completedRequestsCount.rows[0].count, 10),
      pending_kyc: parseInt(pendingKycCount.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Erreur getAdminStats:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
  }
}

// Liste des documents KYC en attente de vérification
async function getPendingKyc(req, res) {
  try {
    const result = await db.query(`
      SELECT 
        kd.id,
        kd.user_id,
        kd.document_type,
        kd.document_url,
        kd.status,
        kd.created_at,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.role,
        sp.business_name
      FROM kyc_documents kd
      JOIN users u ON kd.user_id = u.id
      LEFT JOIN service_providers sp ON sp.user_id = u.id
      WHERE kd.status = 'pending'
      ORDER BY kd.created_at ASC
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur getPendingKyc:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des dossiers KYC' });
  }
}

// Validation ou rejet d'un document KYC
async function reviewKycDocument(req, res) {
  try {
    const adminId = req.user.userId;
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide (approved ou rejected requis)' });
    }

    const docRes = await db.query('SELECT * FROM kyc_documents WHERE id = $1', [id]);
    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document introuvable' });
    }

    const doc = docRes.rows[0];

    // Mettre à jour le document
    const updatedDoc = await db.query(
      `UPDATE kyc_documents
       SET status = $1, rejection_reason = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, status === 'rejected' ? rejection_reason : null, adminId, id]
    );

    // Mettre à jour le statut global de l'utilisateur
    if (status === 'approved') {
      await db.query(
        "UPDATE users SET verification_status = 'verified' WHERE id = $1",
        [doc.user_id]
      );
    } else {
      await db.query(
        "UPDATE users SET verification_status = 'rejected' WHERE id = $1",
        [doc.user_id]
      );
    }

    // Journalisation d'audit
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, target_entity, target_id, details)
       VALUES ($1, $2, 'kyc_documents', $3, $4)`,
      [adminId, `kyc_${status}`, id, JSON.stringify({ status, rejection_reason, user_id: doc.user_id })]
    );

    return res.json({
      message: `Document ${status === 'approved' ? 'validé' : 'rejeté'} avec succès`,
      document: updatedDoc.rows[0],
    });
  } catch (error) {
    console.error('Erreur reviewKycDocument:', error);
    return res.status(500).json({ error: 'Erreur lors de la modération du document' });
  }
}

module.exports = {
  getAdminStats,
  getPendingKyc,
  reviewKycDocument,
};
