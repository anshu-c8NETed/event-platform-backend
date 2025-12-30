const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const { protect } = require('../middleware/auth');

// Get user dashboard data
router.get('/dashboard', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get events created by user with organizer populated
    const createdEvents = await Event.find({ organizer: userId })
      .sort('-createdAt')
      .populate('organizer', 'name email avatar');

    // Get events user is attending with full event details
    const rsvps = await RSVP.find({ user: userId, status: 'confirmed' })
      .populate({
        path: 'event',
        populate: {
          path: 'organizer',
          select: 'name email avatar'
        }
      })
      .sort('-createdAt');

    // Filter out null events (deleted events) and extract event objects
    const attendingEvents = rsvps
      .filter(rsvp => rsvp.event !== null)
      .map(rsvp => rsvp.event);

    // Get statistics
    const stats = {
      totalEventsCreated: await Event.countDocuments({ organizer: userId }),
      totalEventsAttending: await RSVP.countDocuments({ user: userId, status: 'confirmed' }),
      upcomingEvents: await Event.countDocuments({
        organizer: userId,
        date: { $gte: new Date() },
        status: 'upcoming'
      }),
      totalAttendees: createdEvents.reduce((sum, event) => sum + event.currentAttendees, 0)
    };

    res.json({
      success: true,
      data: {
        createdEvents,
        attendingEvents,
        stats
      }
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

module.exports = router;
