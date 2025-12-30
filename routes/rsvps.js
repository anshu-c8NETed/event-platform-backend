const express = require('express');
const router = express.Router();
const {
  createRSVP,
  cancelRSVP,
  getUserRSVPs,
  getEventAttendees,
  checkRSVPStatus
} = require('../controllers/rsvpController');
const { protect } = require('../middleware/auth');

// All RSVP routes require authentication
router.use(protect);

// RSVP to an event (join)
router.post('/event/:eventId', createRSVP);

// Cancel RSVP (leave event)
router.delete('/event/:eventId', cancelRSVP);

// Get user's RSVPs (events they're attending)
router.get('/my-rsvps', getUserRSVPs);

// Get event's attendees
router.get('/event/:eventId/attendees', getEventAttendees);

// Check if user has RSVP'd to specific event
router.get('/event/:eventId/status', checkRSVPStatus);

module.exports = router;