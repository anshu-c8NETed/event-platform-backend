const User = require('../models/User');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');

// Get user profile by ID
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user statistics
    const stats = {
      eventsCreated: await Event.countDocuments({ organizer: user._id }),
      eventsAttending: await RSVP.countDocuments({ user: user._id, status: 'confirmed' })
    };

    res.json({
      success: true,
      data: {
        user,
        stats
      }
    });

  } catch (error) {
    console.error('Get User Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

// Get user dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get events created by user
    const createdEvents = await Event.find({ organizer: userId })
      .sort('-createdAt')
      .populate('organizer', 'name email avatar');

    // Get events user is attending
    const rsvps = await RSVP.find({ user: userId, status: 'confirmed' })
      .populate({
        path: 'event',
        populate: {
          path: 'organizer',
          select: 'name email avatar'
        }
      })
      .sort('-createdAt');

    const attendingEvents = rsvps
      .filter(rsvp => rsvp.event) // Filter out null events (deleted)
      .map(rsvp => rsvp.event);

    // Get statistics
    const stats = {
      totalEventsCreated: await Event.countDocuments({ organizer: userId }),
      totalEventsAttending: await RSVP.countDocuments({ user: userId, status: 'confirmed' }),
      upcomingEventsCreated: await Event.countDocuments({
        organizer: userId,
        date: { $gte: new Date() },
        status: 'upcoming'
      }),
      upcomingEventsAttending: await RSVP.countDocuments({
        user: userId,
        status: 'confirmed',
        event: {
          $in: await Event.find({
            date: { $gte: new Date() },
            status: 'upcoming'
          }).distinct('_id')
        }
      })
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
};

// Update user avatar
exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: 'Please provide avatar URL'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update Avatar Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update avatar',
      error: error.message
    });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete all events created by user
    await Event.deleteMany({ organizer: userId });

    // Delete all RSVPs by user
    await RSVP.deleteMany({ user: userId });

    // Delete user account
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete Account Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
};