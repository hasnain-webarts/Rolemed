import mongoose from 'mongoose';

const MaintenanceLogSchema = new mongoose.Schema(
  {
    serviceDate: {
      type: Date,
      default: Date.now,
    },
    serviceType: {
      type: String,
      enum: [
        'Routine Preventive Maintenance',
        'Corrective Repair',
        'Calibration',
        'Safety Inspection',
        'Emergency Overhaul',
      ],
      default: 'Routine Preventive Maintenance',
    },
    technicianName: {
      type: String,
      required: [true, 'Technician name is required'],
      trim: true,
    },
    vendor: {
      type: String,
      trim: true,
      default: 'In-House Biomedical Engineering',
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      trim: true,
    },
    costPkr: {
      type: Number,
      default: 0,
      min: 0,
    },
    partsReplaced: {
      type: [String],
      default: [],
    },
    nextServiceScheduled: {
      type: Date,
    },
    loggedBy: {
      type: String,
      default: 'Chief Administrator',
    },
  },
  { timestamps: true }
);

const EquipmentSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      required: [true, 'Asset ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Equipment or Asset name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Biomedical Machinery',
        'Hospital Bed',
        'Diagnostic Imaging',
        'Surgical & OT Equipment',
        'Laboratory Instrument',
        'Life Support & Monitoring',
        'Facility Infrastructure',
      ],
      index: true,
    },
    manufacturer: {
      type: String,
      required: [true, 'Manufacturer is required'],
      trim: true,
    },
    modelNumber: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    serialNumber: {
      type: String,
      required: [true, 'Serial number is required'],
      trim: true,
      unique: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Hospital department assignment is required'],
      enum: [
        'ICU',
        'Emergency Room',
        'General Ward A',
        'General Ward B',
        'Operation Theater 1',
        'Operation Theater 2',
        'Dialysis Center',
        'Cardiology',
        'Radiology & Imaging',
        'Pathology Lab',
        'Pediatrics Ward',
        'Maternity Ward',
        'Outpatient Department (OPD)',
      ],
      index: true,
    },
    locationRoom: {
      type: String,
      required: [true, 'Physical location room / bay is required'],
      trim: true,
    },
    bedNumber: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Operational', 'In Use', 'Under Maintenance', 'Needs Inspection', 'Decommissioned'],
      default: 'Operational',
      index: true,
    },
    condition: {
      type: String,
      required: true,
      enum: ['Excellent', 'Good', 'Fair', 'Requires Service', 'Critical / Degraded'],
      default: 'Good',
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now,
    },
    purchaseCostPkr: {
      type: Number,
      required: [true, 'Purchase cost in PKR is required'],
      min: [0, 'Purchase cost cannot be negative'],
    },
    vendorName: {
      type: String,
      required: [true, 'Vendor / Supplier name is required'],
      trim: true,
    },
    vendorContact: {
      type: String,
      trim: true,
      default: '',
    },
    warrantyExpiry: {
      type: Date,
    },
    lastServicedDate: {
      type: Date,
      default: Date.now,
    },
    nextMaintenanceDate: {
      type: Date,
      index: true,
    },
    maintenanceIntervalDays: {
      type: Number,
      default: 90,
      min: 1,
    },
    assignedTechnician: {
      type: String,
      trim: true,
      default: 'Lead Biomedical Eng.',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    maintenanceHistory: {
      type: [MaintenanceLogSchema],
      default: [],
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'equipments',
  }
);

// Pre-save hook to calculate nextMaintenanceDate if not explicitly provided
EquipmentSchema.pre('save', function () {
  if (!this.nextMaintenanceDate && this.lastServicedDate) {
    const nextDate = new Date(this.lastServicedDate);
    nextDate.setDate(nextDate.getDate() + (this.maintenanceIntervalDays || 90));
    this.nextMaintenanceDate = nextDate;
  }
});

export default mongoose.models.Equipment || mongoose.model('Equipment', EquipmentSchema, 'equipments');

