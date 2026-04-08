'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { isBlacklisted } = require('../services/tokenBlacklist');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Middleware d'authentification JWT.
 * Vérifie le header Authorization: Bearer <token>
 * Attache req.user si valide, sinon retourne 401.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  const token = authHeader.split(' ')[1];

  // Vérifier si le token est blacklisté
  if (await isBlacklisted(token)) {
    return res.status(401).json({ error: 'Token invalide ou révoqué.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.user_id);
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Ce compte est désactivé.' });
    }
    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

/**
 * Middleware optionnel — attache req.user si token présent, sinon continue sans erreur.
 */
async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  if (await isBlacklisted(token)) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.user_id);
    req.user = user && user.is_active ? user : null;
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { authenticate, optionalAuthenticate };
