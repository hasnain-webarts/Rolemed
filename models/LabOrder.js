import mongoose from 'mongoose';
import Counter from './Counter.js';

const LabOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
      default: 'Dr. Sarah Johnson',
    },
    consultationId: {
      type: String,
      trim: true,
      default: '',
    },
    testName: {
      type: String,
      required: [true, 'Diagnostic test name is required'],
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Routine', 'Urgent', 'Emergency'],
      default: 'Routine',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Cancelled', 'Specimen Rejected', 'Recollection Requested'],
      default: 'Pending',
      index: true,
    },
    date: {
      type: String,
      required: true,
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    findings: {
      type: String,
      default: '',
      trim: true,
    },
    resultMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    criticalAlert: {
      type: Boolean,
      default: false,
      index: true,
    },
    specimenType: {
      type: String,
      trim: true,
      default: 'Blood',
    },
    specimenCollectedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    processedBy: {
      type: String,
      trim: true,
      default: '',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    rejectedAt: {
      type: Date,
    },
    rejectedBy: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

LabOrderSchema.statics.generateNextOrderId = async function () {
  return await Counter.getNextSequence('labOrderId', {
    prefix: 'REQ-',
    padLength: 3,
    seedFloor: 301,
  });
};

export default mongoose.models.LabOrder || mongoose.model('LabOrder', LabOrderSchema);
