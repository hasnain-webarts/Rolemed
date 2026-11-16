import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: [true, 'Appointment ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    patientId: {
      type: String,
      required: [true, 'Patient ID reference is required'],
      index: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient Name is required'],
      trim: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    doctorName: {
      type: String,
      required: [true, 'Attending doctor name is required'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Appointment date is required (YYYY-MM-DD)'],
      index: true,
    },
    time: {
      type: String,
      default: 'OPD Token Slot',
      trim: true,
    },
    reason: {
      type: String,
      required: [true, 'Clinical reason for appointment is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Checkup', 'Follow-up', 'Emergency', 'Routine'],
      default: 'Checkup',
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No-Show', 'Reschedule Required'],
      default: 'Scheduled',
      index: true,
    },
    queueNumber: {
      type: Number,
      default: 1,
    },
    priority: {
      type: String,
      enum: ['Normal', 'Urgent', 'Emergency'],
      default: 'Normal',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// High-frequency compound indexes for clinical queries and doctor rosters
AppointmentSchema.index({ doctorId: 1, date: 1, status: 1 });
AppointmentSchema.index({ patientId: 1, createdAt: -1 });
AppointmentSchema.index({ date: 1, status: 1, queueNumber: 1 });

AppointmentSchema.statics.generateNextAppointmentId = async function () {
  const records = await this.find({ appointmentId: /^APT-\d+$/ })
    .select('appointmentId')
    .lean();

  if (!records || records.length === 0) {
    return 'APT-101';
  }

  let maxNum = 0;
  for (const r of records) {
    const match = r.appointmentId.match(/^APT-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `APT-${String(maxNum + 1).padStart(3, '0')}`;
};

export default mongoose.models.Appointment || mongoose.model('Appointment', AppointmentSchema);
