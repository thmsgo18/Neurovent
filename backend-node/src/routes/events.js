'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { requireCompany, requireAuthenticated, requireCompanyOrAdmin, requireAdmin } = require('../middleware/permissions');
const { uploadBanner } = require('../middleware/upload');
const ctrl = require('../controllers/eventController');

// ─── Routes publiques ─────────────────────────────────────────────────────────
// IMPORTANT: routes spécifiques AVANT /:id pour éviter les conflits

router.get('/recommended/', authenticate, ctrl.recommendedEvents);
router.get('/my-events/', authenticate, requireCompany, ctrl.myEvents);
router.get('/dashboard-stats/', authenticate, requireCompanyOrAdmin, ctrl.dashboardStats);
router.get('/dashboard-stats/export-summary/', authenticate, requireCompanyOrAdmin, ctrl.exportDashboardSummary);
router.get('/dashboard-stats/export-performance/', authenticate, requireCompanyOrAdmin, ctrl.exportDashboardPerformance);

// ─── Routes admin events ──────────────────────────────────────────────────────
router.get('/admin/', authenticate, requireAdmin, ctrl.adminListEvents);
router.get('/admin/:id/', authenticate, requireAdmin, ctrl.adminGetEvent);
router.delete('/admin/:id/delete/', authenticate, requireAdmin, ctrl.adminDeleteEvent);

// ─── CRUD events ─────────────────────────────────────────────────────────────
router.get('/', optionalAuthenticate, ctrl.listEvents);
router.post('/create/', authenticate, requireCompany, uploadBanner, ctrl.createEvent);
router.get('/:id/', ctrl.getEvent);
router.put('/:id/update/', authenticate, requireCompany, uploadBanner, ctrl.updateEvent);
router.patch('/:id/update/', authenticate, requireCompany, uploadBanner, ctrl.updateEvent);
router.delete('/:id/delete/', authenticate, requireCompany, ctrl.deleteEvent);
router.get('/:id/stats/', authenticate, ctrl.eventStats);

module.exports = router;
