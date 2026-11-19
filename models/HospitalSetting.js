import mongoose from 'mongoose';

/**
 * Hospital Operational Settings & Billing Policy Model (RM-CFG-001)
 * Governs active hospital billing mode, enabled departmental collection counters,
 * fulfillment payment gates, and inpatient daily bed pricing.
 */
const HospitalSettingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'default',
    },
    billingMode: {
      type: String,
      enum: ['Centralized', 'Decentralized', 'Hybrid', 'Custom'],
      default: 'Centralized',
    },
    enabledBillingDepartments: {
      reception: { type: Boolean, default: true },
      pharmacy: { type: Boolean, default: false },
      laboratory: { type: Boolean, default: false },
    },
    clearanceGate: {
      requirePaymentForMeds: { type: Boolean, default: true },
      requirePaymentForLabs: { type: Boolean, default: true },
      emergencyBypass: { type: Boolean, default: true },
    },
    pricingRules: {
      defaultCurrency: { type: String, default: 'PKR' },
      taxPercentage: { type: Number, default: 0 },
      autoCalculateBedStayCharges: { type: Boolean, default: true },
      dailyBedRateGeneralWard: { type: Number, default: 1500 },
      dailyBedRateICU: { type: Number, default: 8000 },
      dailyBedRateEmergency: { type: Number, default: 2000 },
      standardConsultationFee: { type: Number, default: 1000 },
    },
    updatedBy: {
      type: String,
      default: 'Chief Medical Administrator',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Retrieves the singleton hospital configuration document, creating it with defaults if not present.
 * @returns {Promise<Document>}
 */
HospitalSettingSchema.statics.getSettings = async function () {
  let settings = await this.findById('default');
  if (!settings) {
    settings = await this.create({ _id: 'default' });
  }
  return settings;
};

export default mongoose.models.HospitalSetting || mongoose.model('HospitalSetting', HospitalSettingSchema);
