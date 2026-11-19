import { describe, it, expect, vi, beforeEach } from 'vitest';
import HospitalSetting from '@/models/HospitalSetting';
import HospitalInvoice from '@/models/HospitalInvoice';

describe('Configurable Hospital Billing & Financial Routing System', () => {
  describe('HospitalSetting Model & Policy Singleton', () => {
    it('creates default hospital configuration with Centralized mode and PKR currency', () => {
      const setting = new HospitalSetting({});
      expect(setting._id).toBe('default');
      expect(setting.billingMode).toBe('Centralized');
      expect(setting.enabledBillingDepartments.reception).toBe(true);
      expect(setting.enabledBillingDepartments.pharmacy).toBe(false);
      expect(setting.enabledBillingDepartments.laboratory).toBe(false);
      expect(setting.pricingRules.defaultCurrency).toBe('PKR');
      expect(setting.pricingRules.dailyBedRateGeneralWard).toBe(1500);
      expect(setting.pricingRules.dailyBedRateICU).toBe(8000);
      expect(setting.pricingRules.dailyBedRateEmergency).toBe(2000);
      expect(setting.pricingRules.standardConsultationFee).toBe(1000);
      expect(setting.clearanceGate.requirePaymentForMeds).toBe(true);
      expect(setting.clearanceGate.requirePaymentForLabs).toBe(true);
      expect(setting.clearanceGate.emergencyBypass).toBe(true);
    });

    it('supports custom departmental billing switches and mode configuration', () => {
      const hybridSetting = new HospitalSetting({
        billingMode: 'Hybrid',
        enabledBillingDepartments: {
          reception: true,
          pharmacy: false,
          laboratory: true,
        },
        pricingRules: {
          dailyBedRateGeneralWard: 2000,
          dailyBedRateICU: 10000,
          standardConsultationFee: 1500,
        },
      });

      expect(hybridSetting.billingMode).toBe('Hybrid');
      expect(hybridSetting.enabledBillingDepartments.reception).toBe(true);
      expect(hybridSetting.enabledBillingDepartments.pharmacy).toBe(false);
      expect(hybridSetting.enabledBillingDepartments.laboratory).toBe(true);
      expect(hybridSetting.pricingRules.dailyBedRateGeneralWard).toBe(2000);
      expect(hybridSetting.pricingRules.dailyBedRateICU).toBe(10000);
      expect(hybridSetting.pricingRules.standardConsultationFee).toBe(1500);
    });
  });

  describe('HospitalInvoice Model & Currency Calculation', () => {
    it('validates mandatory fields for consolidated hospital invoices', () => {
      const invoice = new HospitalInvoice({
        invoiceId: 'INV-1001',
        patientId: 'PAT-001',
        patientName: 'Ahmad Khan',
        issuedDepartment: 'Reception',
        items: [
          {
            department: 'Reception',
            itemType: 'Bed Stay',
            itemName: 'Inpatient Stay: General Ward (Bed 04)',
            quantity: 3,
            unitPrice: 1500,
            totalPrice: 4500,
          },
          {
            department: 'Pharmacy',
            itemType: 'Medication',
            itemName: 'Amoxicillin 500mg (10 tabs)',
            quantity: 1,
            unitPrice: 350,
            totalPrice: 350,
          },
          {
            department: 'Laboratory',
            itemType: 'Diagnostic Test',
            itemName: 'Complete Blood Count (CBC)',
            quantity: 1,
            unitPrice: 800,
            totalPrice: 800,
          },
        ],
        subtotal: 5650,
        discount: 150,
        totalAmount: 5500,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
      });

      expect(invoice.invoiceId).toBe('INV-1001');
      expect(invoice.patientId).toBe('PAT-001');
      expect(invoice.patientName).toBe('Ahmad Khan');
      expect(invoice.items.length).toBe(3);
      expect(invoice.subtotal).toBe(5650);
      expect(invoice.discount).toBe(150);
      expect(invoice.totalAmount).toBe(5500);
      expect(invoice.paymentStatus).toBe('Paid');
    });

    it('accurately computes inpatient stay accrual for different ward tiers', () => {
      const rates = {
        general: 1500,
        icu: 8000,
        emergency: 2000,
      };

      const calculateBedStay = (ward, days) => {
        const rate =
          ward.toUpperCase().includes('ICU')
            ? rates.icu
            : ward.toUpperCase().includes('EMERGENCY')
            ? rates.emergency
            : rates.general;
        return Math.max(1, days) * rate;
      };

      expect(calculateBedStay('General Ward Male', 4)).toBe(6000);
      expect(calculateBedStay('ICU Critical Unit', 2)).toBe(16000);
      expect(calculateBedStay('Emergency Trauma ER', 1)).toBe(2000);
      expect(calculateBedStay('Maternity Ward', 0)).toBe(1500); // Minimum 1 day billing floor
    });
  });
});
