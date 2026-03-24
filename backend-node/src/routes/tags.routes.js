const router = require('express').Router();
const ctrl = require('../controllers/tags.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', ctrl.listTags);
router.post('/create/', requireAuth, requireAdmin, ctrl.createTag);
router.delete('/:id/delete/', requireAuth, requireAdmin, ctrl.deleteTag);

module.exports = router;
