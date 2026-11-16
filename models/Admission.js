import mongoose from 'mongoose';

const AdmissionSchema = new mongoose.Schema(
  {
    admissionId: {
      type: String,
      required: [true, 'Admission ID is required'],
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
    ward: {
      type: String,
      required: [true, 'Hospital ward assignment is required'],
      enum: [
        'General Ward A',
        'General Ward B',
        'ICU',
        'Maternity Ward',
        'Pediatrics Ward',
        'Maternity',
        'Pediatrics',
        'Emergency Room',
        'Cardiology',
        'Surgery',
      ],
      default: 'General Ward A',
    },
    bedNumber: {
      type: String,
      required: [true, 'Designated bed number is required (e.g. ICU-02, A-101)'],
      trim: true,
      uppercase: true,
    },
    doctorName: {
      type: String,
      required: [true, 'Admitting physician name is required'],
      trim: true,
    },
    admittingDiagnosis: {
      type: String,
      required: [true, 'Admitting diagnosis reason is required'],
      trim: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    dischargeDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Admitted', 'Discharged', 'Transferred'],
      default: 'Admitted',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    transferHistory: [
      {
        fromWard: { type: String, trim: true },
        fromBed: { type: String, trim: true },
        toWard: { type: String, trim: true },
        toBed: { type: String, trim: true },
        reason: { type: String, trim: true },
        transferredAt: { type: Date, default: Date.now },
        transferredBy: { type: String, trim: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// High-frequency compound indexes for bed occupancy checks and ward matrix
AdmissionSchema.index({ ward: 1, bedNumber: 1, status: 1 });
AdmissionSchema.index(
  { ward: 1, bedNumber: 1 },
  { unique: true, partialFilterExpression: { status: 'Admitted' } }
);
AdmissionSchema.index({ patientId: 1, status: 1 });
AdmissionSchema.index({ status: 1, admissionDate: -1 });

AdmissionSchema.statics.generateNextAdmissionId = async function () {
  const lastAdm = await this.findOne({ admissionId: /^ADM-\d+$/ })
    .sort({ createdAt: -1 })
    .select('admissionId')
    .lean();

  if (!lastAdm || !lastAdm.admissionId) {
    return 'ADM-201';
  }

  const matches = lastAdm.admissionId.match(/ADM-(\d+)/);
  if (matches && matches[1]) {
    const nextNum = parseInt(matches[1], 10) + 1;
    return `ADM-${String(nextNum).padStart(3, '0')}`;
  }

  return `ADM-${Math.floor(200 + Math.random() * 800)}`;
};

export default mongoose.models.Admission || mongoose.model('Admission', AdmissionSchema);
