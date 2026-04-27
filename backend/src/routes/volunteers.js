const express = require('express');
const router = express.Router();
const {
  createOrUpdateProfile, listVolunteers, getVolunteer,
  updateAvailability, getTaskHistory,
} = require('../controllers/volunteersController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/profile', authenticate, createOrUpdateProfile);
router.get('/', authenticate, listVolunteers);
router.get('/:id', authenticate, getVolunteer);
router.put('/:id/availability', authenticate, updateAvailability);
router.get('/:id/tasks', authenticate, getTaskHistory);

module.exports = router;
