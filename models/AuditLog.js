import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'DISPENSE', 'BILLING', 'ADMISSION', 'DISCHARGE', 'SYSTEM'],
      index: true,
    },
    module: {
      type: String,
      required: true,
      enum: ['Patients', 'Appointments', 'Doctors', 'Staff', 'Pharmacy', 'Laboratory', 'Billing', 'Admissions', 'Schedules', 'System', 'Assets', 'Equipment'],
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: String,
      required: true,
      trim: true,
      default: 'System Kernel',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userRole: {
      type: String,
      enum: ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician', 'patient', 'system', 'staff'],
      default: 'admin',
    },
    ip: {
      type: String,
      default: '127.0.0.1',
      trim: true,
    },
    alert: {
      type: Boolean,
      default: false,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-frequency compound indexes for audit search and alert monitoring
AuditLogSchema.index({ module: 1, timestamp: -1 });
AuditLogSchema.index({ alert: 1, timestamp: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

