const router = require('express').Router();
const ctrl = require('../controllers/companies.controller');

router.get('/:id/', ctrl.companyPublicProfile);

module.exports = router;
