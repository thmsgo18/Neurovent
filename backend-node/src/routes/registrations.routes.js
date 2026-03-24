const router = require('express').Router();
const ctrl = require('../controllers/registrations.controller');
const { requireAuth, requireParticipant, requireCompany, requireCompanyOrAdmin } = require('../middleware/auth');

// ─── Participant ──────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireParticipant, ctrl.registerToEvent);
router.get('/my/', requireAuth, requireParticipant, ctrl.myRegistrations);
router.patch('/:id/cancel/', requireAuth, requireParticipant, ctrl.cancelRegistration);

// ─── Company / Admin ──────────────────────────────────────────────────────────
router.get('/event/:event_id/', requireAuth, requireCompany, ctrl.eventRegistrations);
router.patch('/:id/status/', requireAuth, requireCompanyOrAdmin, ctrl.updateRegistrationStatus);
router.get('/event/:event_id/export/', requireAuth, ctrl.exportRegistrations);

module.exports = router;
