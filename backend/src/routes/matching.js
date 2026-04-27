const express = require('express');
const router = express.Router();
const {
  runMatching, getSuggestions, assignVolunteer,
  acceptTask, completeTask,
} = require('../controllers/matchingController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/run', authenticate, authorize('ngo_admin', 'super_admin'), runMatching);
router.get('/suggestions/:need_id', authenticate, getSuggestions);
router.post('/assign', authenticate, authorize('ngo_admin', 'super_admin'), assignVolunteer);
router.post('/accept/:task_id', authenticate, acceptTask);
router.post('/complete/:task_id', authenticate, completeTask);

module.exports = router;
