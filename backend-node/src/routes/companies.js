'use strict';

const express = require('express');
const router = express.Router();
const { getCompanyPublicProfile, listCompanies } = require('../controllers/companyController');

router.get('/', listCompanies);
router.get('/:id/', getCompanyPublicProfile);

module.exports = router;
