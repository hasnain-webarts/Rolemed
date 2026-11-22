import mongoose from 'mongoose';
import Counter from './Counter.js';

/**
 * Master Hospital Consolidated Invoice Model (RM-BILL-001)
 * Records centralized or departmental billing transactions across OPD, Inpatient Stays,
 * Pharmacy formulary sales, and Diagnostic pathology tests with itemized department attribution.
 */
const HospitalInvoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: [true, 'Invoice ID is mandatory'],
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
      trim: true,
      uppercase: true,
      index: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient full name is required'],
      trim: true,
    },
    patientPhone: {
      type: String,
      trim: true,
      default: '',
    },
    billingMode: {
      type: String,
      enum: ['Centralized', 'Decentralized', 'Hybrid', 'Custom'],
      default: 'Centralized',
      index: true,
    },
    issuedDepartment: {
      type: String,
      enum: ['Reception', 'Pharmacy', 'Laboratory', 'Administration'],
      default: 'Reception',
      index: true,
    },
    items: [
      {
        department: {
          type: String,
          enum: ['Reception', 'Pharmacy', 'Laboratory', 'General', 'IPD', 'OPD', 'Administration'],
          required: true,
        },
        itemType: {
          type: String,
          enum: ['Consultation', 'BedStay', 'Bed Stay', 'Medication', 'LabTest', 'Diagnostic Test', 'Procedure', 'Service'],
          default: 'Service',
        },
        referenceId: {
          type: String,
          trim: true,
          default: '',
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        itemName: {
          type: String,
          trim: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Unpaid', 'Partially Paid', 'Waived'],
      default: 'Paid',
      index: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Credit/Debit Card', 'Bank Transfer', 'EasyPaisa/JazzCash', 'JazzCash', 'EasyPaisa', 'Insurance', 'Waived'],
      default: 'Cash',
    },
    collectedBy: {
      type: String,
      trim: true,
      default: 'Hospital Cashier',
    },
    cashierName: {
      type: String,
      default: 'Hospital Cashier',
      trim: true,
    },
    cashierRole: {
      type: String,
      default: 'receptionist',
    },
    linkedPharmacyInvoiceId: {
      type: String,
      trim: true,
      default: '',
    },
    linkedLabInvoiceId: {
      type: String,
      trim: true,
      default: '',
    },
    linkedAdmissionId: {
      type: String,
      trim: true,
      default: '',
    },
    linkedAppointmentId: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// High-frequency compound indexes for cashier searches and administrative revenue queries
HospitalInvoiceSchema.index({ paymentStatus: 1, createdAt: -1 });
HospitalInvoiceSchema.index({ patientId: 1, createdAt: -1 });
HospitalInvoiceSchema.index({ issuedDepartment: 1, createdAt: -1 });

/**
 * Atomically generates next sequential Hospital Invoice ID (e.g. "INV-1001")
 */
HospitalInvoiceSchema.statics.generateNextInvoiceId = async function () {
  return await Counter.getNextSequence('hospitalInvoiceId', {
    prefix: 'INV-',
    padLength: 4,
    seedFloor: 1001,
  });
};

export default mongoose.models.HospitalInvoice || mongoose.model('HospitalInvoice', HospitalInvoiceSchema);
