const Event = require('../models/Event');
const RSVP = require('../models/RSVP');

// Create new event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, location, capacity, image, category } = req.body;

    // Validation
    if (!title || !description || !date || !location || !capacity || !image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Create event
    const event = await Event.create({
      title,
      description,
      date,
      location,
      capacity,
      image,
      category,
      organizer: req.user.id
    });

    // Populate organizer details
    await event.populate('organizer', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });

  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
};

// Get all events (with filtering, search, pagination)
exports.getAllEvents = async (req, res) => {
  try {
    const {
      search,
      category,
      status = 'upcoming',
      sort = '-date',
      page = 1,
      limit = 12
    } = req.query;

    // Build query
    const query = {};

    // Search by title or description
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Only show future events for upcoming
    if (status === 'upcoming') {
      query.date = { $gte: new Date() };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const events = await Event.find(query)
      .populate('organizer', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      count: events.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: events
    });

  } catch (error) {
    console.error('Get Events Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
};

// Get single event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email avatar')
      .populate('attendees', 'name email avatar');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if current user has RSVP'd (if authenticated)
    let hasRSVP = false;
    if (req.user) {
      const rsvp = await RSVP.findOne({
        user: req.user.id,
        event: event._id,
        status: 'confirmed'
      });
      hasRSVP = !!rsvp;
    }

    res.json({
      success: true,
      data: {
        ...event.toObject(),
        hasRSVP
      }
    });

  } catch (error) {
    console.error('Get Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message
    });
  }
};

// Update event (only by organizer)
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // Don't allow capacity reduction below current attendees
    if (req.body.capacity && req.body.capacity < event.currentAttendees) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce capacity below current attendees (${event.currentAttendees})`
      });
    }

    // Update event
    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('organizer', 'name email avatar');

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });

  } catch (error) {
    console.error('Update Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
};

// Delete event (only by organizer)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    // Delete all associated RSVPs
    await RSVP.deleteMany({ event: event._id });

    // Delete event
    await event.deleteOne();

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete Event Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
};

// Get events created by current user
exports.getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.id })
      .sort('-createdAt')
      .populate('organizer', 'name email avatar');

    res.json({
      success: true,
      count: events.length,
      data: events
    });

  } catch (error) {
    console.error('Get My Events Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message
    });
  }
};