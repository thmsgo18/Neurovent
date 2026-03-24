const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { handleLogoUpload } = require('../middleware/upload');

// ─── Inscription ──────────────────────────────────────────────────────────────
router.post('/register/participant/', ctrl.registerParticipant);
router.post('/register/company/', ctrl.registerCompany);

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login/participant/', ctrl.loginParticipant);
router.post('/login/company/', ctrl.loginCompany);

// ─── Tokens ───────────────────────────────────────────────────────────────────
router.post('/token/refresh/', ctrl.refreshToken);
router.post('/logout/', requireAuth, ctrl.logout);

// ─── Profil ───────────────────────────────────────────────────────────────────
router.get('/me/', requireAuth, ctrl.getProfile);
router.patch('/me/', requireAuth, handleLogoUpload, ctrl.updateProfile);
router.put('/me/', requireAuth, handleLogoUpload, ctrl.updateProfile);
router.delete('/me/', requireAuth, ctrl.deleteAccount);

// ─── Mot de passe ─────────────────────────────────────────────────────────────
router.patch('/me/password/', requireAuth, ctrl.changePassword);
router.post('/password-reset/', ctrl.passwordResetRequest);
router.post('/password-reset/confirm/', ctrl.passwordResetConfirm);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/stats/', requireAuth, requireAdmin, ctrl.adminStats);
router.get('/admin/users/', requireAuth, requireAdmin, ctrl.adminUserList);
router.patch('/admin/users/:id/suspend/', requireAuth, requireAdmin, ctrl.adminSuspendUser);
router.patch('/admin/users/:id/activate/', requireAuth, requireAdmin, ctrl.adminActivateUser);
router.delete('/admin/users/:id/delete/', requireAuth, requireAdmin, ctrl.adminDeleteUser);

module.exports = router;
