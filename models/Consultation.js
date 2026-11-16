import mongoose from 'mongoose';

const ConsultationSchema = new mongoose.Schema(
  {
    consultationId: {
      type: String,
      required: [true, 'Consultation ID is required'],
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
    appointmentId: {
      type: String,
      trim: true,
      default: '',
    },
    symptoms: {
      type: String,
      default: 'Routine clinical consultation & follow-up',
    },
    vitals: {
      bp: { type: String, default: '120/80' },
      temp: { type: String, default: '98.6°F' },
      pulse: { type: String, default: '72 bpm' },
      respRate: { type: String, default: '16 /min' },
      spO2: { type: String, default: '98%' },
      weight: { type: String, default: '70 kg' },
    },
    diagnosis: {
      type: String,
      required: [true, 'Clinical diagnosis with ICD-10 code is required'],
      trim: true,
    },
    labs: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      required: [true, 'Clinical notes and treatment plan are required'],
      trim: true,
    },
    addenda: [
      {
        note: { type: String, required: true, trim: true },
        author: { type: String, required: true, trim: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    date: {
      type: String,
      required: true,
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ConsultationSchema.statics.generateNextConsultationId = async function () {
  const records = await this.find({ consultationId: /^CON-\d+$/ })
    .select('consultationId')
    .lean();

  if (!records || records.length === 0) {
    return 'CON-1001';
  }

  let maxNum = 0;
  for (const r of records) {
    const match = r.consultationId.match(/^CON-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `CON-${maxNum + 1}`;
};

export default mongoose.models.Consultation || mongoose.model('Consultation', ConsultationSchema);
