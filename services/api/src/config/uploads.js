const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOADS_DIR = path.resolve(
  process.env.UPLOADS_DIR || path.resolve(__dirname, '../../uploads')
);

const SCOPES = ['avatar', 'logo', 'portfolio', 'request', 'brand'];

// Crée le dossier + les sous-dossiers si besoin
function ensureUploadDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  for (const scope of SCOPES) {
    const dir = path.join(UPLOADS_DIR, scope);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveScope(value) {
  return SCOPES.includes(value) ? value : 'request';
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function pickExtension(file) {
  if (EXT_BY_MIME[file.mimetype]) return EXT_BY_MIME[file.mimetype];
  const ext = path.extname(file.originalname || '').toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : '.bin';
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const scope = resolveScope(req.query.scope || req.body?.scope);
    const dir = path.join(UPLOADS_DIR, scope);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${pickExtension(file)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const ok = ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXT.has(ext);
    if (!ok) {
      const err = new Error('Format d’image non supporté (JPEG, PNG, WEBP ou GIF uniquement)');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

module.exports = { UPLOADS_DIR, ensureUploadDirs, upload, resolveScope, SCOPES };