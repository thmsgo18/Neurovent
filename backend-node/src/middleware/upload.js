const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MEDIA_ROOT = path.join(__dirname, '..', '..', 'media');

function storageFor(folder) {
  const dest = path.join(MEDIA_ROOT, folder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, folder + '-' + unique + ext);
    },
  });
}

function fileFilter(req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.'));
  }
}

// Upload logo company → media/logos/
const uploadLogo = multer({
  storage: storageFor('logos'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
}).single('company_logo');

// Upload bannière event → media/banners/
const uploadBanner = multer({
  storage: storageFor('banners'),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
}).single('banner');

/**
 * Middleware combiné pour les routes company profile.
 * Gère les erreurs multer proprement (retourne 400 au lieu de 500).
 */
function handleLogoUpload(req, res, next) {
  uploadLogo(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

function handleBannerUpload(req, res, next) {
  uploadBanner(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

module.exports = { handleLogoUpload, handleBannerUpload };
