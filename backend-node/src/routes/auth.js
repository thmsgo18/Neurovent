'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const { uploadLogo, uploadDocument } = require('../middleware/upload');
const ctrl = require('../controllers/authController');

// ─── Inscription ──────────────────────────────────────────────────────────────
router.post('/register/participant/', ctrl.registerParticipant);
router.post('/register/company/', ctrl.registerCompany);

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login/participant/', ctrl.loginParticipant);
router.post('/login/company/', ctrl.loginCompany);

// ─── Tokens ───────────────────────────────────────────────────────────────────
router.post('/token/refresh/', ctrl.refreshToken);
router.post('/logout/', authenticate, ctrl.logout);

// ─── Profil ───────────────────────────────────────────────────────────────────
router.get('/me/', authenticate, ctrl.getProfile);
router.patch('/me/', authenticate, uploadLogo, ctrl.updateProfile);
router.put('/me/', authenticate, uploadLogo, ctrl.updateProfile);
router.delete('/me/', authenticate, ctrl.deleteAccount);

// ─── Mot de passe ─────────────────────────────────────────────────────────────
router.patch('/me/password/', authenticate, ctrl.changePassword);
router.post('/password-reset/', ctrl.passwordResetRequest);
router.post('/password-reset/confirm/', ctrl.passwordResetConfirm);

// ─── Vérification document ───────────────────────────────────────────────────
router.patch('/me/verification/document/', authenticate, uploadDocument, ctrl.uploadVerificationDocument);


// ─── Profil public participant ────────────────────────────────────────
router.get('/participants/:id/', authenticate, ctrl.getParticipantPublicProfile);

// ─── Admin — Statistiques ─────────────────────────────────────────
router.get('/admin/stats/', authenticate, requireAdmin, ctrl.adminStats);

// ─── Admin — Utilisateurs ────────────────────────────────────────
router.get('/admin/users/', authenticate, requireAdmin, ctrl.adminListUsers);
router.get('/admin/users/:id/', authenticate, requireAdmin, ctrl.adminGetUser);
router.patch('/admin/users/:id/suspend/', authenticate, requireAdmin, ctrl.adminSuspendUser);
router.patch('/admin/users/:id/activate/', authenticate, requireAdmin, ctrl.adminActivateUser);
router.delete('/admin/users/:id/delete/', authenticate, requireAdmin, ctrl.adminDeleteUser);

// ─── Admin — Companies ──────────────────────────────────────────────────
router.get('/admin/companies/', authenticate, requireAdmin, ctrl.adminListCompanies);
router.get('/admin/companies/pending/', authenticate, requireAdmin, ctrl.adminPendingCompanies);
router.patch('/admin/companies/:id/verify/', authenticate, requireAdmin, ctrl.adminVerifyCompany);

module.exports = router;
