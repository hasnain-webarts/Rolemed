import mongoose from 'mongoose';

const MedicineSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'SKU code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'Antibiotics',
        'Analgesics',
        'Antidiabetics',
        'Cardiovascular',
        'Respiratory',
        'Gastrointestinal',
        'Dermatology',
        'Neurology',
        'Other',
      ],
      required: [true, 'Therapeutic category is required'],
      default: 'Other',
      index: true,
    },
    dosageForm: {
      type: String,
      enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Ointment', 'Drops', 'Other'],
      default: 'Tablet',
    },
    strength: {
      type: String,
      trim: true,
      default: '',
    },
    quantityPerPack: {
      type: Number,
      required: [true, 'Quantity per pack is required'],
      min: [1, 'Quantity per pack must be at least 1'],
      default: 10,
    },
    pricePerPack: {
      type: Number,
      required: [true, 'Price per pack in PKR is required'],
      min: [0, 'Price per pack cannot be negative'],
      default: 0.0,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price in PKR is required'],
      min: [0, 'Unit price cannot be negative'],
      default: 0.0,
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity (total units) is required'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0,
      index: true,
    },
    reorderLevel: {
      type: Number,
      default: 20,
      min: 0,
    },
    expiryDate: {
      type: String,
      required: [true, 'Expiry date is required'],
      index: true,
    },
    manufacturer: {
      type: String,
      trim: true,
      default: 'Hospital Formulary',
    },
    batchNumber: {
      type: String,
      trim: true,
      default: 'BATCH-001',
    },
    location: {
      type: String,
      trim: true,
      default: 'Central Pharmacy Shelf A',
    },
  },
  {
    timestamps: true,
  }
);

MedicineSchema.pre('save', function () {
  if (this.pricePerPack !== undefined && this.quantityPerPack && this.quantityPerPack > 0) {
    if (!this.unitPrice || this.isModified('pricePerPack') || this.isModified('quantityPerPack')) {
      this.unitPrice = Math.round((this.pricePerPack / this.quantityPerPack) * 100) / 100;
    }
  } else if (this.unitPrice && (!this.pricePerPack || this.isModified('unitPrice'))) {
    this.pricePerPack = Math.round(this.unitPrice * (this.quantityPerPack || 1) * 100) / 100;
  }
});

MedicineSchema.statics.generateNextSku = async function () {
  const lastMed = await this.findOne({ sku: /^MED-\d+$/ })
    .sort({ createdAt: -1 })
    .select('sku')
    .lean();

  if (!lastMed || !lastMed.sku) {
    return 'MED-001';
  }

  const matches = lastMed.sku.match(/MED-(\d+)/);
  if (matches && matches[1]) {
    const nextNum = parseInt(matches[1], 10) + 1;
    return `MED-${String(nextNum).padStart(3, '0')}`;
  }

  return `MED-${Math.floor(100 + Math.random() * 900)}`;
};

export default mongoose.models.Medicine || mongoose.model('Medicine', MedicineSchema);
