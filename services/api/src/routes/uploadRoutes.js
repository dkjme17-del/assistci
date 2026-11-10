const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const { upload } = require('../config/uploads');
const { authenticateToken } = require('../middlewares/auth');
const { config } = require('../config/env');

// POST /api/uploads/image?scope=avatar|logo|portfolio|request|brand
router.post(
  '/image',
  (req, res, next) => {
    if (!config.fileUploadsEnabled) {
      return res.status(503).json({
        error: 'Téléversements désactivés',
        message: 'Les téléversements ne sont pas disponibles sur la version démo.',
      });
    }
    next();
  },
  authenticateToken,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Fichier trop volumineux (max 5 Mo)'
            : err.message;
        return res.status(400).json({ error: message });
      }
      if (err) {
        return res.status(err.status || 400).json({ error: err.message });
      }
      next();
    });
  },
  uploadController.uploadImage
);

module.exports = router;