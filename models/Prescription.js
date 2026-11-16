import mongoose from 'mongoose';

const DrugItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage specification is required'],
      trim: true,
    },
    frequency: {
      type: String,
      default: 'Once daily',
      trim: true,
    },
    duration: {
      type: String,
      default: '5 days',
      trim: true,
    },
    instruction: {
      type: String,
      default: 'After meals',
      trim: true,
    },
    qtyNeeded: {
      type: Number,
      default: 10,
      min: 1,
    },
    qtyDispensed: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantityPerPack: {
      type: Number,
      default: 10,
      min: 1,
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
      default: 0,
      min: 0,
    },
    isCustomerAddOn: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const PrescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: {
      type: String,
      required: [true, 'Prescription ID is required'],
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
    drugs: {
      type: [DrugItemSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one medication item must be prescribed',
      },
    },
    generalInstructions: {
      type: String,
      default: 'Take medications as directed. Finish course unless adverse reactions occur.',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending Dispensation', 'Partially Dispensed', 'Dispensed', 'Cancelled'],
      default: 'Pending Dispensation',
      index: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Waived'],
      default: 'Unpaid',
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
    dispensedAt: {
      type: Date,
    },
    dispensedBy: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

PrescriptionSchema.statics.generateNextPrescriptionId = async function () {
  const records = await this.find({ prescriptionId: /^RX-\d+$/ })
    .select('prescriptionId')
    .lean();

  if (!records || records.length === 0) {
    return 'RX-9941';
  }

  let maxNum = 0;
  for (const r of records) {
    const match = r.prescriptionId.match(/^RX-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `RX-${maxNum + 1}`;
};

export default mongoose.models.Prescription || mongoose.model('Prescription', PrescriptionSchema);
