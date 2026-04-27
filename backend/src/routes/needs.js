const express = require('express');
const router = express.Router();
const {
  createNeed, listNeeds, getNeed, updateNeed,
  deleteNeed, bulkUpload, getHeatmap,
} = require('../controllers/needsController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', authenticate, createNeed);
router.get('/', authenticate, listNeeds);
router.get('/heatmap', authenticate, getHeatmap);
router.get('/:id', authenticate, getNeed);
router.put('/:id', authenticate, authorize('ngo_admin', 'super_admin'), updateNeed);
router.delete('/:id', authenticate, authorize('ngo_admin', 'super_admin'), deleteNeed);
router.post('/bulk-upload', authenticate, upload.single('image'), bulkUpload);

module.exports = router;
