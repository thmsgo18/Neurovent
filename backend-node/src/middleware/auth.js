const { verifyToken } = require('../utils/jwt');
const db = require('../db/database');

/**
 * Vérifie le token JWT Bearer et attache req.user.
 * Retourne 401 si absent/invalide, 403 si compte désactivé.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Token invalide.' });
    }

    // Vérifier la blacklist
    const blacklisted = db.prepare('SELECT id FROM token_blacklist WHERE jti = ?').get(payload.jti);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token révoqué. Veuillez vous reconnecter.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.user_id);
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Ce compte est désactivé.' });
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

/**
 * Comme requireAuth mais ne bloque pas si absent.
 * req.user = null si non connecté.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = header.split(' ')[1];
  try {
    const payload = verifyToken(token);
    if (payload.type !== 'access') {
      req.user = null;
      return next();
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.user_id);
    req.user = user || null;
    req.tokenPayload = payload;
    next();
  } catch {
    req.user = null;
    next();
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_staff) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  next();
}

function requireCompany(req, res, next) {
  if (!req.user || req.user.role !== 'COMPANY') {
    return res.status(403).json({ error: 'Accès réservé aux entreprises.' });
  }
  next();
}

function requireParticipant(req, res, next) {
  if (!req.user || req.user.role !== 'PARTICIPANT') {
    return res.status(403).json({ error: 'Accès réservé aux participants.' });
  }
  next();
}

function requireCompanyOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'COMPANY' && !req.user.is_staff)) {
    return res.status(403).json({ error: 'Accès réservé aux entreprises et administrateurs.' });
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireCompany,
  requireParticipant,
  requireCompanyOrAdmin,
};
