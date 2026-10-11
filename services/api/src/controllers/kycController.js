const db = require('../config/db');

// Soumettre un document KYC (CNI, selfie, passeport, etc.)
async function uploadKycDocument(req, res) {
  try {
    const userId = req.user.userId;
    const { document_type, document_url } = req.body;

    if (!document_type || !document_url) {
      return res.status(400).json({
        error: 'Champs manquants',
        message: 'Le type de document et l URL du document sont requis',
      });
    }

    const validTypes = ['cni', 'passport', 'selfie', 'trade_register', 'driving_license', 'other'];
    if (!validTypes.includes(document_type)) {
      return res.status(400).json({
        error: 'Type invalide',
        message: `Type accepté : ${validTypes.join(', ')}`,
      });
    }

    const result = await db.query(
      `INSERT INTO kyc_documents (user_id, document_type, document_url, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [userId, document_type, document_url]
    );

    // Mettre à jour le statut utilisateur en pending
    await db.query(
      "UPDATE users SET verification_status = 'pending' WHERE id = $1 AND verification_status = 'rejected'",
      [userId]
    );

    return res.status(201).json({
      message: 'Document soumis pour vérification',
      document: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur uploadKycDocument:', error);
    return res.status(500).json({ error: 'Erreur lors de la soumission du document' });
  }
}

// Récupérer les documents KYC de l'utilisateur connecté
async function getMyKycDocuments(req, res) {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      'SELECT id, document_type, document_url, status, rejection_reason, created_at, reviewed_at FROM kyc_documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('Erreur getMyKycDocuments:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  uploadKycDocument,
  getMyKycDocuments,
};
