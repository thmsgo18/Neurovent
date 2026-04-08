'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireParticipant, requireCompany, requireCompanyOrAdmin, requireAuthenticated } = require('../middleware/permissions');
const ctrl = require('../controllers/registrationController');

// ─── Participant ──────────────────────────────────────────────────────────────
router.post('/', authenticate, requireParticipant, ctrl.registerToEvent);
router.get('/my/', authenticate, requireParticipant, ctrl.myRegistrations);
router.patch('/:id/cancel/', authenticate, requireParticipant, ctrl.cancelRegistration);

// ─── Company / Admin ─────────────────────────────────────────────────────────
router.get('/event/:event_id/', authenticate, requireCompany, ctrl.eventRegistrations);
router.patch('/:id/status/', authenticate, requireCompanyOrAdmin, ctrl.updateRegistrationStatus);
router.patch('/:id/remove/', authenticate, requireCompanyOrAdmin, ctrl.removeRegistration);
router.get('/event/:event_id/export/', authenticate, requireAuthenticated, ctrl.exportEventRegistrations);

module.exports = router;
