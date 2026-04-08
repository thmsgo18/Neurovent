'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crée les dossiers media si nécessaires
const MEDIA_ROOT = path.join(__dirname, '../../media');
['logos', 'banners', 'verification_docs'].forEach(dir => {
  const fullPath = path.join(MEDIA_ROOT, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

function createStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(MEDIA_ROOT, subfolder));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${ext}`);
    },
  });
}

function imageFilter(req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont acceptées (jpg, png, gif, webp).'));
  }
}

function documentFilter(req, file, cb) {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers PDF et images sont acceptés.'));
  }
}

const uploadLogo = multer({
  storage: createStorage('logos'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('company_logo');

const uploadBanner = multer({
  storage: createStorage('banners'),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('banner');

const uploadDocument = multer({
  storage: createStorage('verification_docs'),
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('verification_document');

module.exports = { uploadLogo, uploadBanner, uploadDocument };
