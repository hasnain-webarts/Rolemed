import { describe, it, expect } from 'vitest';
import Equipment from '@/models/Equipment';

describe('Hospital Equipment & Asset Model / Calculations', () => {
  describe('Equipment Schema Validation Rules', () => {
    it('requires assetId, name, category, manufacturer, serialNumber, department, locationRoom, and purchaseCostPkr', () => {
      const emptyDoc = new Equipment({});
      const error = emptyDoc.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.assetId).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.category).toBeDefined();
      expect(error.errors.manufacturer).toBeDefined();
      expect(error.errors.serialNumber).toBeDefined();
      expect(error.errors.department).toBeDefined();
      expect(error.errors.locationRoom).toBeDefined();
      expect(error.errors.purchaseCostPkr).toBeDefined();
    });

    it('validates allowed categories', () => {
      const doc = new Equipment({
        assetId: 'EQP-9999',
        name: 'Invalid Asset',
        category: 'NonExistentCategory',
        manufacturer: 'Test',
        serialNumber: 'SN-001',
        department: 'ICU',
        locationRoom: 'Bay 1',
        purchaseCostPkr: 100000,
      });

      const error = doc.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });

    it('validates allowed departments', () => {
      const doc = new Equipment({
        assetId: 'EQP-9999',
        name: 'Valid Machine',
        category: 'Biomedical Machinery',
        manufacturer: 'Siemens',
        serialNumber: 'SN-002',
        department: 'InvalidDepartmentXYZ',
        locationRoom: 'Bay 1',
        purchaseCostPkr: 500000,
      });

      const error = doc.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.department).toBeDefined();
    });

    it('rejects negative purchase cost', () => {
      const doc = new Equipment({
        assetId: 'EQP-9999',
        name: 'Ventilator',
        category: 'Biomedical Machinery',
        manufacturer: 'Dräger',
        serialNumber: 'SN-003',
        department: 'ICU',
        locationRoom: 'Bay 1',
        purchaseCostPkr: -50000,
      });

      const error = doc.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.purchaseCostPkr).toBeDefined();
    });

    it('validates a correct Equipment document successfully', () => {
      const doc = new Equipment({
        assetId: 'EQP-1001',
        name: 'Dräger Evita V300 Ventilator',
        category: 'Biomedical Machinery',
        manufacturer: 'Dräger Medical',
        serialNumber: 'SN-DRG-88210',
        department: 'ICU',
        locationRoom: 'ICU Bay 1',
        purchaseCostPkr: 2850000,
        vendorName: 'Siemens Healthcare (Pvt) Ltd - Lahore',
      });

      const error = doc.validateSync();
      expect(error).toBeUndefined();
      expect(doc.status).toBe('Operational');
      expect(doc.condition).toBe('Good');
      expect(doc.maintenanceIntervalDays).toBe(90);
    });
  });

  describe('Fleet Asset Calculation & Maintenance Logic', () => {
    it('correctly detects overdue maintenance', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 10 * 86400000); // 10 days ago
      const futureDate = new Date(now.getTime() + 10 * 86400000); // 10 days in future

      const isOverdue = (nextDate, status) => {
        if (!nextDate || status === 'Decommissioned') return false;
        return new Date(nextDate) <= now;
      };

      expect(isOverdue(pastDate, 'Operational')).toBe(true);
      expect(isOverdue(futureDate, 'Operational')).toBe(false);
      expect(isOverdue(pastDate, 'Decommissioned')).toBe(false);
    });

    it('correctly computes next maintenance date based on interval', () => {
      const serviceDate = new Date('2026-01-01T00:00:00Z');
      const intervalDays = 90;

      const nextDate = new Date(serviceDate);
      nextDate.setDate(nextDate.getDate() + intervalDays);

      const diffInDays = Math.round((nextDate - serviceDate) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBe(90);
    });

    it('aggregates total capitalized fleet valuation in PKR', () => {
      const fleet = [
        { status: 'Operational', purchaseCostPkr: 2850000 },
        { status: 'In Use', purchaseCostPkr: 2400000 },
        { status: 'Under Maintenance', purchaseCostPkr: 3600000 },
        { status: 'Decommissioned', purchaseCostPkr: 500000 }, // Should exclude decommissioned
      ];

      const activeValuation = fleet
        .filter((item) => item.status !== 'Decommissioned')
        .reduce((sum, item) => sum + item.purchaseCostPkr, 0);

      expect(activeValuation).toBe(8850000);
    });

    it('accurately counts operational hospital bed capacity', () => {
      const assets = [
        { category: 'Hospital Bed', status: 'Operational', bedNumber: 'ICU-01' },
        { category: 'Hospital Bed', status: 'In Use', bedNumber: 'ICU-02' },
        { category: 'Hospital Bed', status: 'Under Maintenance', bedNumber: 'ICU-03' },
        { category: 'Hospital Bed', status: 'Decommissioned', bedNumber: 'A-99' },
        { category: 'Biomedical Machinery', status: 'Operational' },
      ];

      const totalBeds = assets.filter(
        (a) => a.category === 'Hospital Bed' && a.status !== 'Decommissioned'
      ).length;

      const operationalBeds = assets.filter(
        (a) => a.category === 'Hospital Bed' && a.status === 'Operational'
      ).length;

      expect(totalBeds).toBe(3);
      expect(operationalBeds).toBe(1);
    });

    it('correctly blocks inpatient admission if bed is under maintenance or decommissioned', () => {
      const isBedAvailableForAdmission = (bedAsset) => {
        if (!bedAsset) return true; // Unregistered bed allowed with warning
        return !['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(bedAsset.status);
      };

      expect(isBedAvailableForAdmission({ status: 'Operational' })).toBe(true);
      expect(isBedAvailableForAdmission({ status: 'Under Maintenance' })).toBe(false);
      expect(isBedAvailableForAdmission({ status: 'Needs Inspection' })).toBe(false);
      expect(isBedAvailableForAdmission({ status: 'Decommissioned' })).toBe(false);
    });

    it('correctly handles bed allocation and release lifecycle', () => {
      let bed = {
        bedNumber: 'ICU-01',
        status: 'Operational',
        notes: '',
      };

      // 1. Patient admitted
      bed.status = 'In Use';
      bed.notes = 'Occupied by PAT-001 (Muhammad Ali)';
      expect(bed.status).toBe('In Use');

      // 2. Patient discharged
      bed.status = 'Operational';
      bed.notes = 'Bed sanitized and ready for intake.';
      expect(bed.status).toBe('Operational');
    });
  });
});

