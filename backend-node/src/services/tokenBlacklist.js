'use strict';

/**
 * tokenBlacklist.js — Gestion persistante de la liste noire des refresh tokens (logout).
 *
 * Équivalent Node.js du TokenBlacklist de djangorestframework-simplejwt (Django).
 * Les tokens révoqués sont stockés en base de données dans la table `blacklisted_tokens`.
 */

const { BlacklistedToken } = require('../models');

/**
 * Ajoute un token à la liste noire (persistant en base).
 * @param {string} token — le refresh token à blacklister
 */
async function blacklistToken(token) {
  await BlacklistedToken.findOrCreate({
    where: { token },
    defaults: { token, blacklisted_at: new Date() },
  });
}

/**
 * Vérifie si un token est blacklisté.
 * @param {string} token
 * @returns {Promise<boolean>}
 */
async function isBlacklisted(token) {
  const entry = await BlacklistedToken.findOne({ where: { token } });
  return entry !== null;
}

module.exports = { blacklistToken, isBlacklisted };
