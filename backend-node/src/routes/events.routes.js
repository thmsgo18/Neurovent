const router = require('express').Router();
const ctrl = require('../controllers/events.controller');
const { requireAuth, optionalAuth, requireCompany, requireParticipant } = require('../middleware/auth');
const { handleBannerUpload } = require('../middleware/upload');

// ─── Publics ──────────────────────────────────────────────────────────────────
router.get('/', optionalAuth, ctrl.listEvents);
router.get('/recommended/', requireAuth, requireParticipant, ctrl.recommendedEvents);
router.get('/my-events/', requireAuth, requireCompany, ctrl.myEvents);
router.get('/:id/stats/', requireAuth, ctrl.eventStats);
router.get('/:id/', ctrl.getEvent);

// ─── Company ──────────────────────────────────────────────────────────────────
router.post('/create/', requireAuth, requireCompany, handleBannerUpload, ctrl.createEvent);
router.patch('/:id/update/', requireAuth, requireCompany, handleBannerUpload, ctrl.updateEvent);
router.put('/:id/update/', requireAuth, requireCompany, handleBannerUpload, ctrl.updateEvent);
router.delete('/:id/delete/', requireAuth, requireCompany, ctrl.deleteEvent);

module.exports = router;
