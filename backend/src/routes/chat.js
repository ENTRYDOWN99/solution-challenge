const express = require('express');
const router = express.Router();
const { chatWithGemini } = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// POST /api/chat — authenticated, any role
router.post('/', authenticate, chatWithGemini);

module.exports = router;
