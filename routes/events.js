const express = require('express');
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getMyEvents
} = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Public routes
router.get('/', getAllEvents);
router.get('/:id', getEventById);

// Protected routes
router.post('/', protect, upload.single('image'), createEvent);
router.get('/my/events', protect, getMyEvents);
router.put('/:id', protect, upload.single('image'), updateEvent);
router.delete('/:id', protect, deleteEvent);

module.exports = router;