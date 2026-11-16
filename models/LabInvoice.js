import mongoose from 'mongoose';

const LabInvoiceTestSchema = new mongoose.Schema(
  {
    testCode: {
      type: String,
      trim: true,
      default: '',
    },
    testName: {
      type: String,
      required: [true, 'Diagnostic test name is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General Diagnostic',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const LabInvoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: [true, 'Invoice ID is required'],
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
      trim: true,
      default: 'WALK-IN',
      index: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    orderId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    tests: {
      type: [LabInvoiceTestSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Invoice must contain at least one diagnostic test',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Unpaid', 'Waived'],
      default: 'Paid',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Insurance', 'Pending'],
      default: 'Cash',
    },
    date: {
      type: String,
      required: true,
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    billedBy: {
      type: String,
      trim: true,
      default: 'Laboratory Technologist',
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

LabInvoiceSchema.statics.generateNextInvoiceId = async function () {
  const records = await this.find({ invoiceId: /^LAB-INV-\d+$/ })
    .select('invoiceId')
    .lean();

  if (!records || records.length === 0) {
    return 'LAB-INV-701';
  }

  let maxNum = 0;
  for (const r of records) {
    const match = r.invoiceId.match(/^LAB-INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `LAB-INV-${maxNum + 1}`;
};

export default mongoose.models.LabInvoice || mongoose.model('LabInvoice', LabInvoiceSchema);

