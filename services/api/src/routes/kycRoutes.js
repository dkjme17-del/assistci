const express = require('express');
const multer = require('multer');
const router = express.Router();
const kycController = require('../controllers/kycController');
const { authenticateToken } = require('../middlewares/auth');
const { uploadKycFile } = require('../config/kycStorage');
const { config } = require('../config/env');

router.post('/upload', (req, res, next) => {
	if (!config.fileUploadsEnabled) {
		return res.status(503).json({
			error: 'Vérification KYC désactivée',
			message: 'La soumission de documents KYC n’est pas disponible sur la version démo.',
		});
	}
	next();
}, authenticateToken, (req, res, next) => {
	uploadKycFile.single('file')(req, res, (error) => {
		if (error instanceof multer.MulterError) {
			const message = error.code === 'LIMIT_FILE_SIZE'
				? 'Fichier trop volumineux (10 Mo maximum)'
				: error.message;
			return res.status(400).json({ error: message });
		}
		if (error) return res.status(error.status || 400).json({ error: error.message });
		next();
	});
}, kycController.uploadKycDocument);
router.get('/documents/:id/file', authenticateToken, kycController.getKycDocumentFile);
router.get('/my-documents', authenticateToken, kycController.getMyKycDocuments);

module.exports = router;
