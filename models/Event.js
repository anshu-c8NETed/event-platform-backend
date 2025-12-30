const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide event title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide event description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  date: {
    type: Date,
    required: [true, 'Please provide event date'],
    validate: {
      validator: function(value) {
        // Event date must be in the future (for new events)
        return this.isNew ? value > new Date() : true;
      },
      message: 'Event date must be in the future'
    }
  },
  location: {
    type: String,
    required: [true, 'Please provide event location'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  capacity: {
    type: Number,
    required: [true, 'Please provide event capacity'],
    min: [1, 'Capacity must be at least 1'],
    max: [10000, 'Capacity cannot exceed 10,000']
  },
  currentAttendees: {
    type: Number,
    default: 0,
    min: [0, 'Current attendees cannot be negative']
  },
  image: {
    type: String,
    required: [true, 'Please provide event image'],
    default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87'
  },
  category: {
    type: String,
    enum: ['conference', 'workshop', 'meetup', 'seminar', 'webinar', 'social', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event must have an organizer']
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
EventSchema.index({ date: 1, status: 1 }); // Query by date and status
EventSchema.index({ organizer: 1 }); // Query events by organizer
EventSchema.index({ category: 1 }); // Filter by category
EventSchema.index({ title: 'text', description: 'text' }); // Text search

// Virtual for available spots
EventSchema.virtual('availableSpots').get(function() {
  return this.capacity - this.currentAttendees;
});

// Virtual for checking if event is full
EventSchema.virtual('isFull').get(function() {
  return this.currentAttendees >= this.capacity;
});

// Virtual for checking if event is past
EventSchema.virtual('isPast').get(function() {
  return this.date < new Date();
});

// Middleware: Auto-update status based on date (Mongoose 7+ compatible)
EventSchema.pre('save', function() {
  const now = new Date();
  const eventDate = new Date(this.date);
  const eventEndTime = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000); // Assume 4-hour duration

  if (now < eventDate) {
    this.status = 'upcoming';
  } else if (now >= eventDate && now < eventEndTime) {
    this.status = 'ongoing';
  } else if (now >= eventEndTime) {
    this.status = 'completed';
  }
});

// Validation: Ensure currentAttendees doesn't exceed capacity (Mongoose 7+ compatible)
EventSchema.pre('save', function() {
  if (this.currentAttendees > this.capacity) {
    throw new Error('Current attendees cannot exceed capacity');
  }
});

// Static method: Find upcoming events
EventSchema.statics.findUpcoming = function() {
  return this.find({
    date: { $gte: new Date() },
    status: 'upcoming'
  }).sort('date');
};

// Static method: Find events by organizer
EventSchema.statics.findByOrganizer = function(organizerId) {
  return this.find({ organizer: organizerId }).sort('-createdAt');
};

// Instance method: Check if user is attending
EventSchema.methods.isUserAttending = function(userId) {
  return this.attendees.some(attendee => 
    attendee.toString() === userId.toString()
  );
};

module.exports = mongoose.model('Event', EventSchema);