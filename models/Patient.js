import mongoose from 'mongoose';
import Counter from './Counter.js';

const PatientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide the patient full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    age: {
      type: Number,
      required: [true, 'Please provide patient age'],
      min: [0, 'Age cannot be negative'],
      max: [130, 'Age exceeds standard limit'],
    },
    gender: {
      type: String,
      required: [true, 'Please specify patient gender'],
      enum: {
        values: ['Male', 'Female', 'Other'],
        message: '{VALUE} is not a valid gender designation',
      },
    },
    phone: {
      type: String,
      required: [true, 'Please provide contact telephone number'],
      trim: true,
    },
    cnic: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' },
    },
    allergies: {
      type: [String],
      default: [],
    },
    medicalHistory: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Outpatient', 'Inpatient', 'Discharged', 'Critical'],
      default: 'Outpatient',
    },
    assignedBed: {
      type: String,
      default: '',
      trim: true,
    },
    vitalsHistory: [
      {
        date: { type: String, default: () => new Date().toISOString().split('T')[0] },
        bp: { type: String, default: '120/80' },
        temp: { type: String, default: '98.6°F' },
        pulse: { type: String, default: '72 bpm' },
        weight: { type: String, default: '70 kg' },
        recordedBy: { type: String, default: 'Clinical Staff' },
      },
    ],
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Static method to auto-generate next sequential PAT-xxx ID with atomic collision protection (RM-DATA-003)
PatientSchema.statics.generateNextPatientId = async function () {
  try {
    const lastPatient = await this.findOne({ patientId: /^PAT-\d+$/ })
      .sort({ createdAt: -1 })
      .select('patientId')
      .lean();

    let seedFloor = 1;
    if (lastPatient?.patientId) {
      const match = lastPatient.patientId.match(/^PAT-(\d+)$/);
      if (match) seedFloor = parseInt(match[1], 10) + 1;
    }

    return await Counter.getNextSequence('patientId', {
      prefix: 'PAT-',
      padLength: 3,
      seedFloor,
    });
  } catch (err) {
    console.warn('[Counter fallback triggered for patient ID]:', err.message);
    const records = await this.find({ patientId: /^PAT-\d+$/ })
      .select('patientId')
      .lean();

    if (!records || records.length === 0) {
      return 'PAT-001';
    }

    let maxNum = 0;
    for (const r of records) {
      const match = r.patientId.match(/^PAT-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    return `PAT-${String(maxNum + 1).padStart(3, '0')}`;
  }
};

export default mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
