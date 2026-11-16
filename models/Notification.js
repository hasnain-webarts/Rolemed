import mongoose from 'mongoose';
import Counter from './Counter';

const NotificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    recipientId: {
      type: String,
      required: true,
      trim: true,
      index: true, // e.g. "PAT-001", "DOC-102", "admin", or User _id
    },
    recipientRole: {
      type: String,
      required: true,
      enum: ['patient', 'doctor', 'admin', 'receptionist', 'pharmacist', 'lab-technician'],
      index: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    recipientPhone: {
      type: String,
      trim: true, // Canonical Pakistani phone (03xxxxxxxxx)
    },
    type: {
      type: String,
      required: true,
      enum: [
        'PATIENT_REGISTRATION',
        'APPOINTMENT_CONFIRMATION',
        'APPOINTMENT_RESCHEDULED',
        'APPOINTMENT_REMINDER',
        'LAB_REPORT_READY',
        'LAB_PAYMENT_PENDING',
        'INPATIENT_ADMISSION',
        'INPATIENT_DISCHARGE',
        'STAFF_CREDENTIALS',
        'LEAVE_STATUS_UPDATE',
        'DUTY_ROSTER_UPDATE',
        'EQUIPMENT_MAINTENANCE_DUE',
        'PHARMACY_LOW_STOCK',
        'SECURITY_ALERT',
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true, // Plain text content for WhatsApp and mobile alerts
    },
    html: {
      type: String, // Rich HTML formatted body for Email delivery
    },
    channels: {
      type: [String],
      enum: ['email', 'whatsapp', 'in_app'],
      default: ['in_app'],
    },
    deliveryStatus: {
      email: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped', 'simulated'],
        default: 'pending',
      },
      whatsapp: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped', 'simulated'],
        default: 'pending',
      },
      inApp: {
        type: String,
        enum: ['unread', 'read', 'dismissed'],
        default: 'unread',
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
    },
    errorDetails: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

// Compound indexes for rapid notification retrieval and unread counters
NotificationSchema.index({ recipientId: 1, 'deliveryStatus.inApp': 1, createdAt: -1 });
NotificationSchema.index({ recipientRole: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

/**
 * Generates the next sequential Notification ID (NOTIF-1001+)
 */
NotificationSchema.statics.generateNextNotificationId = async function () {
  for (let attempt = 0; attempt < 10; attempt++) {
    const nextId = await Counter.getNextSequence('notificationId', {
      prefix: 'NOTIF-',
      padLength: 4,
      seedFloor: 1000,
    });
    const exists = await this.exists({ notificationId: nextId });
    if (!exists) return nextId;
  }
  return `NOTIF-${Date.now().toString().slice(-6)}`;
};

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export default Notification;

