const express = require('express');
const router = express.Router();
const { getSummary, getTrends, getCoverageGaps, getTopNeeds } = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/summary', authenticate, getSummary);
router.get('/trends', authenticate, getTrends);
router.get('/coverage-gaps', authenticate, getCoverageGaps);
router.get('/top-needs', authenticate, getTopNeeds);

module.exports = router;
