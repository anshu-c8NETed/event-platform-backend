const mongoose = require('mongoose');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');

/**
 * CRITICAL CONCURRENCY HANDLING
 * 
 * This controller uses atomic operations to prevent race conditions:
 * - findOneAndUpdate with $expr condition checks capacity atomically
 * - No transactions needed for development (standalone MongoDB)
 */

// Create RSVP (Join Event) - WITHOUT TRANSACTION
exports.createRSVP = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Step 1: Check if RSVP already exists
    const existingRSVP = await RSVP.findOne({
      user: userId,
      event: eventId,
      status: 'confirmed'
    });

    if (existingRSVP) {
      return res.status(400).json({
        success: false,
        message: 'You have already RSVP\'d to this event'
      });
    }

    // Step 2: ATOMIC UPDATE - Increment attendees only if capacity allows
    // This is the KEY to preventing race conditions!
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        $expr: { $lt: ['$currentAttendees', '$capacity'] } // Ensure space available
      },
      {
        $inc: { currentAttendees: 1 },
        $addToSet: { attendees: userId }
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Step 3: Check if update succeeded
    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'Event is full or does not exist'
      });
    }

    // Step 4: Create RSVP record
    const rsvp = await RSVP.create({
      user: userId,
      event: eventId,
      status: 'confirmed'
    });

    // Populate user and event details
    const populatedRSVP = await RSVP.findById(rsvp._id)
      .populate('user', 'name email avatar')
      .populate('event', 'title date location');

    res.status(201).json({
      success: true,
      message: 'RSVP confirmed successfully',
      data: {
        rsvp: populatedRSVP,
        availableSpots: event.capacity - event.currentAttendees
      }
    });

  } catch (error) {
    console.error('RSVP Creation Error:', error);
    
    // Handle duplicate RSVP error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already RSVP\'d to this event'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create RSVP',
      error: error.message
    });
  }
};

// Cancel RSVP (Leave Event) - WITHOUT TRANSACTION
exports.cancelRSVP = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Step 1: Find and delete RSVP
    const rsvp = await RSVP.findOneAndDelete({
      user: userId,
      event: eventId,
      status: 'confirmed'
    });

    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: 'RSVP not found'
      });
    }

    // Step 2: ATOMIC UPDATE - Decrement attendees
    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        $inc: { currentAttendees: -1 },
        $pull: { attendees: userId }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'RSVP cancelled successfully',
      data: {
        availableSpots: event.capacity - event.currentAttendees
      }
    });

  } catch (error) {
    console.error('RSVP Cancellation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel RSVP',
      error: error.message
    });
  }
};

// Get user's RSVPs
exports.getUserRSVPs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'confirmed' } = req.query;

    const rsvps = await RSVP.find({
      user: userId,
      status
    })
    .populate({
      path: 'event',
      select: 'title description date location capacity currentAttendees image category organizer',
      populate: {
        path: 'organizer',
        select: 'name email'
      }
    })
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: rsvps.length,
      data: rsvps
    });

  } catch (error) {
    console.error('Get RSVPs Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RSVPs',
      error: error.message
    });
  }
};

// Get event's attendees
exports.getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;

    const rsvps = await RSVP.find({
      event: eventId,
      status: 'confirmed'
    })
    .populate('user', 'name email avatar')
    .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: rsvps.length,
      data: rsvps
    });

  } catch (error) {
    console.error('Get Attendees Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendees',
      error: error.message
    });
  }
};

// Check if user has RSVP'd to an event
exports.checkRSVPStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const rsvp = await RSVP.findOne({
      user: userId,
      event: eventId,
      status: 'confirmed'
    });

    res.json({
      success: true,
      data: {
        hasRSVP: !!rsvp,
        rsvp: rsvp || null
      }
    });

  } catch (error) {
    console.error('Check RSVP Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check RSVP status',
      error: error.message
    });
  }
};