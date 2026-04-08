'use strict';

/**
 * permissions.js — Middlewares de permissions par rôle.
 * Équivalent des classes IsParticipant, IsCompany, IsAdminUser de Django REST Framework.
 */

function requireParticipant(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
  if (req.user.role !== 'PARTICIPANT') {
    return res.status(403).json({ error: 'Réservé aux participants.' });
  }
  next();
}

function requireCompany(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
  if (req.user.role !== 'COMPANY') {
    return res.status(403).json({ error: 'Réservé aux entreprises organisatrices.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
  if (!req.user.is_staff) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  next();
}

function requireCompanyOrAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
  if (req.user.role !== 'COMPANY' && !req.user.is_staff) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  next();
}

function requireAuthenticated(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentification requise.' });
  next();
}

module.exports = {
  requireParticipant,
  requireCompany,
  requireAdmin,
  requireCompanyOrAdmin,
  requireAuthenticated,
};
