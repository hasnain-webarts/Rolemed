import mongoose from 'mongoose';

const InvoiceItemSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    qtyUnits: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    packs: {
      type: Number,
      default: 1,
      min: 0,
    },
    pricePerPack: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    billingType: {
      type: String,
      enum: ['Pack', 'Unit'],
      default: 'Pack',
    },
  },
  { _id: false }
);

const PharmacyInvoiceSchema = new mongoose.Schema(
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
    prescriptionId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    items: {
      type: [InvoiceItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Invoice must contain at least one medicine item',
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
      enum: ['Paid', 'Unpaid', 'Refunded'],
      default: 'Paid',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Insurance'],
      default: 'Cash',
    },
    date: {
      type: String,
      required: true,
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    dispensedBy: {
      type: String,
      trim: true,
      default: 'Clinical Pharmacist',
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

PharmacyInvoiceSchema.statics.generateNextInvoiceId = async function () {
  const records = await this.find({ invoiceId: /^PH-INV-\d+$/ })
    .select('invoiceId')
    .lean();

  if (!records || records.length === 0) {
    return 'PH-INV-501';
  }

  let maxNum = 0;
  for (const r of records) {
    const match = r.invoiceId.match(/^PH-INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `PH-INV-${maxNum + 1}`;
};

export default mongoose.models.PharmacyInvoice || mongoose.model('PharmacyInvoice', PharmacyInvoiceSchema);

