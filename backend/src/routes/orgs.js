const express = require('express');
const router = express.Router();
const { createOrg, getOrgNeeds, webhook, getOrg, listOrgs, regenerateApiKey } = require('../controllers/orgsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, listOrgs);
router.post('/', authenticate, authorize('ngo_admin', 'super_admin'), createOrg);
router.get('/:id', authenticate, getOrg);
router.get('/:id/needs', authenticate, getOrgNeeds);
router.post('/:id/regenerate-key', authenticate, authorize('ngo_admin', 'super_admin'), regenerateApiKey);
router.post('/webhook', webhook); // No auth - uses API key

module.exports = router;
