import mongoose from 'mongoose';

const DutyRosterSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    staffName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      default: 'Staff Practitioner',
    },
    department: {
      type: String,
      required: true,
      trim: true,
      default: 'General Operations',
    },
    shift: {
      type: String,
      enum: [
        'Morning',
        'Evening',
        'Night',
        'General',
        'Off',
        'Morning (08:00 - 16:00)',
        'Evening (16:00 - 00:00)',
        'Night (00:00 - 08:00)',
      ],
      default: 'Morning',
    },
    date: {
      type: String,
      required: true,
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Active', 'On Duty', 'Completed', 'Absent', 'Leave', 'Cancelled'],
      default: 'Active',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.DutyRoster || mongoose.model('DutyRoster', DutyRosterSchema);
