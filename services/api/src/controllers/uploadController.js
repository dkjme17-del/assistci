const { resolveScope } = require('../config/uploads');

// Téléverse une image et renvoie son URL relative (/uploads/<scope>/<fichier>)
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    const scope = resolveScope(req.query.scope || req.body?.scope);
    const url = `/uploads/${scope}/${req.file.filename}`;

    return res.status(201).json({
      message: 'Image téléversée',
      scope,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url,
    });
  } catch (error) {
    console.error('Erreur uploadImage:', error);
    return res.status(500).json({ error: 'Erreur lors du téléversement' });
  }
}

module.exports = { uploadImage };