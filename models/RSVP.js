const mongoose = require('mongoose');

const RSVPSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event is required']
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'waitlist'],
    default: 'confirmed'
  },
  rsvpDate: {
    type: Date,
    default: Date.now
  },
  cancellationDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Compound index to ensure one RSVP per user per event
RSVPSchema.index({ user: 1, event: 1 }, { unique: true });

// Index for querying RSVPs by event
RSVPSchema.index({ event: 1, status: 1 });

// Index for querying RSVPs by user
RSVPSchema.index({ user: 1, status: 1 });

// Prevent duplicate RSVPs (extra validation) - Mongoose 7+ compatible
RSVPSchema.pre('save', async function() {
  if (this.isNew) {
    const existing = await mongoose.model('RSVP').findOne({
      user: this.user,
      event: this.event,
      status: 'confirmed'
    });

    if (existing) {
      const error = new Error('You have already RSVP\'d to this event');
      error.code = 11000; // Duplicate key error code
      throw error;
    }
  }
});

// Update cancellation date when status changes to cancelled (Mongoose 7+ compatible)
RSVPSchema.pre('save', function() {
  if (this.isModified('status') && this.status === 'cancelled') {
    this.cancellationDate = new Date();
  }
});

module.exports = mongoose.model('RSVP', RSVPSchema);