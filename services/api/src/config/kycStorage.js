const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const KYC_UPLOAD_DIR = path.resolve(
  process.env.KYC_UPLOAD_DIR || path.resolve(__dirname, '../../private-uploads/kyc')
);
const EXTENSIONS_BY_MIME = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
};

function ensureKycUploadDir() {
  fs.mkdirSync(KYC_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, callback) {
    ensureKycUploadDir();
    callback(null, KYC_UPLOAD_DIR);
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const normalizedExtension = extension === '.jpeg' ? '.jpg' : extension;
    callback(null, `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${normalizedExtension}`);
  },
});

const uploadKycFile = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const extensions = EXTENSIONS_BY_MIME[file.mimetype];
    const extension = path.extname(file.originalname || '').toLowerCase();
    const extensionMatches = extensions?.includes(extension)
      || (file.mimetype === 'image/jpeg' && extension === '.jpg');
    if (!extensionMatches) {
      const error = new Error('Format refusé. Sélectionnez un fichier JPG, PNG ou PDF.');
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

async function hasValidSignature(file) {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (file.mimetype === 'application/pdf') return buffer.subarray(0, 5).toString() === '%PDF-';
    if (file.mimetype === 'image/png') return bytesRead >= 8 && buffer.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (file.mimetype === 'image/jpeg') return bytesRead >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    return false;
  } finally {
    await handle.close();
  }
}

module.exports = { KYC_UPLOAD_DIR, ensureKycUploadDir, uploadKycFile, hasValidSignature };