const db = require('../config/db');
const fs = require('fs/promises');
const path = require('path');
const { KYC_UPLOAD_DIR, hasValidSignature } = require('../config/kycStorage');

// Soumettre un document KYC (CNI, selfie, passeport, etc.)
async function uploadKycDocument(req, res) {
  let uploadedFilePath = req.file?.path;
  const rejectUpload = async (status, body) => {
    if (uploadedFilePath) await fs.unlink(uploadedFilePath).catch(() => {});
    uploadedFilePath = null;
    return res.status(status).json(body);
  };

  try {
    const userId = req.user.userId;
    const { document_type } = req.body;
    const secureUrl = req.body.document_url?.trim();

    if (!document_type || (!req.file && !secureUrl) || (req.file && secureUrl)) {
      return rejectUpload(400, {
        error: 'Champs manquants',
        message: 'Choisissez un type de document et fournissez un fichier ou un lien sécurisé',
      });
    }

    const validTypes = ['cni', 'passport', 'selfie', 'trade_register', 'driving_license', 'other'];
    if (!validTypes.includes(document_type)) {
      return rejectUpload(400, {
        error: 'Type invalide',
        message: `Type accepté : ${validTypes.join(', ')}`,
      });
    }

    if (secureUrl) {
      let parsedUrl;
      try {
        parsedUrl = new URL(secureUrl);
      } catch {
        return rejectUpload(400, { error: 'Lien sécurisé invalide' });
      }
      if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
        return rejectUpload(400, { error: 'Le lien du document doit être une URL HTTPS sécurisée' });
      }
    }

    if (req.file && !(await hasValidSignature(req.file))) {
      return rejectUpload(400, { error: 'Le contenu du fichier ne correspond pas à un JPG, PNG ou PDF valide' });
    }

    const documentUrl = req.file ? req.file.filename : secureUrl;

    const result = await db.query(
      `INSERT INTO kyc_documents (user_id, document_type, document_url, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [userId, document_type, documentUrl]
    );
    uploadedFilePath = null;

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
    if (uploadedFilePath) await fs.unlink(uploadedFilePath).catch(() => {});
    console.error('Erreur uploadKycDocument:', error);
    return res.status(500).json({ error: 'Erreur lors de la soumission du document' });
  }
}

async function getKycDocumentFile(req, res) {
  try {
    const result = await db.query(
      'SELECT user_id, document_url FROM kyc_documents WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document introuvable' });

    const document = result.rows[0];
    if (req.user.role !== 'admin' && Number(document.user_id) !== Number(req.user.userId)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    if (/^https:\/\//i.test(document.document_url)) {
      return res.status(404).json({ error: 'Ce document est hébergé sur un lien sécurisé externe' });
    }

    const filename = path.basename(document.document_url);
    if (filename !== document.document_url) return res.status(404).json({ error: 'Document introuvable' });
    const filePath = path.join(KYC_UPLOAD_DIR, filename);
    await fs.access(filePath);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.download(filePath, `justificatif-${req.params.id}${path.extname(filename)}`);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'Fichier confidentiel introuvable' });
    console.error('Erreur getKycDocumentFile:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du document' });
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
  getKycDocumentFile,
  getMyKycDocuments,
};

