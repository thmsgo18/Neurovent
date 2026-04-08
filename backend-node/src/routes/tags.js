'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const ctrl = require('../controllers/tagController');

router.get('/', ctrl.listTags);
router.post('/create/', authenticate, requireAdmin, ctrl.createTag);
router.delete('/:id/delete/', authenticate, requireAdmin, ctrl.deleteTag);

module.exports = router;
