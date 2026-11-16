import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide full practitioner or staff name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an official hospital domain email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a secure password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: true,
    },
    role: {
      type: String,
      required: [true, 'Please designate an assigned hospital role'],
      enum: {
        values: ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician', 'patient'],
        message: '{VALUE} is not a valid hospital role',
      },
    },
    department: {
      type: String,
      default: 'General Practice',
      trim: true,
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    patientId: {
      type: String,
      default: '',
      trim: true,
      sparse: true,
    },
    phone: {
      type: String,
      default: '',
    },
    dispensaryWing: {
      type: String,
      default: 'Central Inpatient & Outpatient Dispensary',
      trim: true,
    },
    labWing: {
      type: String,
      default: 'Clinical Pathology & Diagnostics Wing',
      trim: true,
    },
    licenseNumber: {
      type: String,
      default: 'RPh-882194-STATE',
      trim: true,
    },
    certifications: {
      type: String,
      default: 'MLT, ASCP Certified Specialist in Blood Banking',
      trim: true,
    },
    specialization: {
      type: String,
      default: '',
      trim: true,
    },
    qualifications: {
      type: String,
      default: 'MBBS',
      trim: true,
    },
    experienceYears: {
      type: Number,
      default: 5,
    },
    shift: {
      type: String,
      default: 'Morning (08:00 - 16:00)',
      trim: true,
    },
    office: {
      type: String,
      default: 'Suite 302, OPD Wing B',
      trim: true,
    },
    assignedWard: {
      type: String,
      default: 'General Ward',
      trim: true,
    },
    consultationFee: {
      type: Number,
      default: 2500,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    deskStation: {
      type: String,
      default: 'Main Lobby Entrance • Counter B',
      trim: true,
    },
    weeklySchedule: {
      type: Array,
      default: () => [
        { day: 'Monday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '30 mins' },
        { day: 'Tuesday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '30 mins' },
        { day: 'Wednesday', active: true, start: '09:00 AM', end: '01:00 PM', slotDuration: '30 mins' },
        { day: 'Thursday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '30 mins' },
        { day: 'Friday', active: true, start: '09:00 AM', end: '05:00 PM', slotDuration: '30 mins' },
        { day: 'Saturday', active: false, start: '10:00 AM', end: '02:00 PM', slotDuration: '45 mins' },
        { day: 'Sunday', active: false, start: '10:00 AM', end: '02:00 PM', slotDuration: '30 mins' },
      ],
    },
    leaves: {
      type: Array,
      default: () => [],
    },
    isOnCall: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to hash password with bcrypt
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  // If already hashed with bcrypt, do not re-hash
  if (typeof this.password === 'string' && /^\$2[abxy]\$\d{2}\$/.test(this.password)) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare candidate password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
