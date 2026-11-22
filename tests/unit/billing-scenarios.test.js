import { describe, it, expect } from 'vitest';
import HospitalSetting from '@/models/HospitalSetting';
import HospitalInvoice from '@/models/HospitalInvoice';
import AuditLog from '@/models/AuditLog';

describe('Comprehensive Hospital Billing Scenarios (IPD, OPD, Pharmacy, Lab, Routing)', () => {
  // =========================================================================
  // 1. IPD (INPATIENT DEPARTMENT) SCENARIOS
  // =========================================================================
  describe('IPD (Inpatient Stays & Ward Accommodations)', () => {
    const defaultPricing = {
      dailyBedRateGeneralWard: 1500,
      dailyBedRateICU: 8000,
      dailyBedRateEmergency: 2000,
    };

    const calculateAdmissionCharge = (admission, now = Date.now(), pricing = defaultPricing) => {
      if (!admission) return null;
      const admissionTime = new Date(admission.admissionDate).getTime();
      const diffMs = Math.max(0, now - admissionTime);
      const stayDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      let dailyRate = pricing.dailyBedRateGeneralWard;
      const wardUpper = (admission.ward || '').toUpperCase();
      if (wardUpper.includes('ICU') || wardUpper.includes('INTENSIVE')) {
        dailyRate = pricing.dailyBedRateICU;
      } else if (wardUpper.includes('EMERGENCY') || wardUpper.includes('TRAUMA') || /\bER\b/.test(wardUpper)) {
        dailyRate = pricing.dailyBedRateEmergency;
      }

      return {
        admissionId: admission.admissionId,
        ward: admission.ward,
        bedNumber: admission.bedNumber,
        admissionDate: admission.admissionDate,
        stayDays,
        dailyRate,
        totalCharge: stayDays * dailyRate,
        doctorName: admission.doctorName || 'Attending Physician',
      };
    };

    const fixedNow = 1700000000000;

    it('calculates General Ward stay accurately for multi-day admission', () => {
      const fourDaysAgo = new Date(fixedNow - 4 * 24 * 60 * 60 * 1000).toISOString();
      const adm = {
        admissionId: 'ADM-001',
        patientId: 'PAT-001',
        ward: 'General Ward Male',
        bedNumber: 'B-04',
        admissionDate: fourDaysAgo,
        doctorName: 'Dr. Tariq Mahmood',
      };

      const result = calculateAdmissionCharge(adm, fixedNow);
      expect(result.stayDays).toBe(4);
      expect(result.dailyRate).toBe(1500);
      expect(result.totalCharge).toBe(6000);
      expect(result.doctorName).toBe('Dr. Tariq Mahmood');
      expect(result.ward).toBe('General Ward Male');
      expect(result.bedNumber).toBe('B-04');
    });

    it('applies ICU premium tier daily rate accurately', () => {
      const twoDaysAgo = new Date(fixedNow - 2 * 24 * 60 * 60 * 1000).toISOString();
      const adm = {
        admissionId: 'ADM-002',
        patientId: 'PAT-002',
        ward: 'Intensive Care Unit (ICU)',
        bedNumber: 'ICU-02',
        admissionDate: twoDaysAgo,
        doctorName: 'Dr. Usman Ali',
      };

      const result = calculateAdmissionCharge(adm, fixedNow);
      expect(result.stayDays).toBe(2);
      expect(result.dailyRate).toBe(8000);
      expect(result.totalCharge).toBe(16000);
    });

    it('applies Emergency & Trauma ward daily rate accurately', () => {
      const oneDayAgo = new Date(fixedNow - 1 * 24 * 60 * 60 * 1000).toISOString();
      const adm = {
        admissionId: 'ADM-003',
        patientId: 'PAT-003',
        ward: 'Emergency Trauma Ward',
        bedNumber: 'ER-01',
        admissionDate: oneDayAgo,
        doctorName: 'Dr. Ayesha Siddiqui',
      };

      const result = calculateAdmissionCharge(adm, fixedNow);
      expect(result.stayDays).toBe(1);
      expect(result.dailyRate).toBe(2000);
      expect(result.totalCharge).toBe(2000);
    });

    it('enforces a minimum billing floor of 1 day for same-day admissions', () => {
      const twoHoursAgo = new Date(fixedNow - 2 * 60 * 60 * 1000).toISOString();
      const adm = {
        admissionId: 'ADM-004',
        patientId: 'PAT-004',
        ward: 'Surgical Day Ward',
        bedNumber: 'SW-05',
        admissionDate: twoHoursAgo,
      };

      const result = calculateAdmissionCharge(adm, fixedNow);
      expect(result.stayDays).toBe(1);
      expect(result.totalCharge).toBe(1500);
    });
  });

  // =========================================================================
  // 2. OPD (OUTPATIENT DEPARTMENT) SCENARIOS
  // =========================================================================
  describe('OPD (Doctor Consultations & Appointments)', () => {
    const defaultConsultationFee = 1000;

    const processAppointments = (appointments, billedRefIds = new Set(), standardFee = defaultConsultationFee) => {
      return appointments
        .filter((apt) => ['Scheduled', 'Confirmed', 'In Consultation', 'Completed'].includes(apt.status))
        .filter((apt) => !billedRefIds.has(apt.appointmentId || apt._id))
        .map((apt) => ({
          appointmentId: apt.appointmentId || apt._id,
          doctorName: apt.doctorName || apt.doctor || 'Consulting Physician',
          department: apt.department || 'Outpatient Clinic',
          date: apt.date,
          time: apt.time,
          fee: Number(apt.fee) > 0 ? Number(apt.fee) : standardFee,
        }));
    };

    it('applies custom doctor consultation fee when set, or falls back to standard fee', () => {
      const appointments = [
        {
          appointmentId: 'APT-101',
          doctorName: 'Dr. Tariq Mahmood',
          department: 'Cardiology',
          status: 'Completed',
          fee: 2500,
          date: '2026-11-23',
          time: '10:00 AM',
        },
        {
          appointmentId: 'APT-102',
          doctorName: 'Dr. Fatima Noor',
          department: 'General Medicine',
          status: 'Completed',
          fee: 0, // Fallback to standard
          date: '2026-11-23',
          time: '11:30 AM',
        },
      ];

      const processed = processAppointments(appointments);
      expect(processed).toHaveLength(2);
      expect(processed[0].fee).toBe(2500);
      expect(processed[0].doctorName).toBe('Dr. Tariq Mahmood');
      expect(processed[0].department).toBe('Cardiology');
      expect(processed[1].fee).toBe(1000);
      expect(processed[1].doctorName).toBe('Dr. Fatima Noor');
    });

    it('excludes appointments that have already been billed into hospital invoices', () => {
      const appointments = [
        { appointmentId: 'APT-201', doctorName: 'Dr. Ali', status: 'Completed', fee: 1500 },
        { appointmentId: 'APT-202', doctorName: 'Dr. Sara', status: 'Completed', fee: 1200 },
      ];

      const billedRefs = new Set(['APT-201']);
      const pending = processAppointments(appointments, billedRefs);
      expect(pending).toHaveLength(1);
      expect(pending[0].appointmentId).toBe('APT-202');
      expect(pending[0].fee).toBe(1200);
    });

    it('ignores cancelled or no-show appointments', () => {
      const appointments = [
        { appointmentId: 'APT-301', doctorName: 'Dr. Ayesha', status: 'Cancelled', fee: 1000 },
        { appointmentId: 'APT-302', doctorName: 'Dr. Ayesha', status: 'No Show', fee: 1000 },
        { appointmentId: 'APT-303', doctorName: 'Dr. Ayesha', status: 'Confirmed', fee: 1000 },
      ];

      const pending = processAppointments(appointments);
      expect(pending).toHaveLength(1);
      expect(pending[0].appointmentId).toBe('APT-303');
    });
  });

  // =========================================================================
  // 3. PHARMACY SCENARIOS & MULTI-DRUG ITEMIZATION
  // =========================================================================
  describe('Pharmacy (Prescriptions & Multi-Drug Line Itemization)', () => {
    const formatDoctorName = (docName) => {
      if (!docName) return 'Doctor';
      const trimmed = docName.trim();
      return trimmed.startsWith('Dr.') || trimmed.startsWith('Dr ') ? trimmed : `Dr. ${trimmed}`;
    };

    const itemizePrescriptionForCart = (rx) => {
      const items = [];
      if (Array.isArray(rx.drugs) && rx.drugs.length > 0) {
        rx.drugs.forEach((drug, dIdx) => {
          const lineQty = Number(drug.qtyNeeded) || 1;
          const unitPr = Number(drug.unitPrice) || (Number(drug.totalPrice) / lineQty) || 0;
          const lineTotal = Number(drug.totalPrice) || (unitPr * lineQty);
          items.push({
            id: `rx-${rx.prescriptionId}-d-${dIdx}`,
            department: 'Pharmacy',
            itemType: 'Medication',
            itemName: `${drug.name}${drug.dosage ? ` (${drug.dosage})` : ''} - ${formatDoctorName(rx.doctorName)}`,
            quantity: lineQty,
            unitPrice: unitPr,
            totalPrice: lineTotal,
            referenceId: rx.prescriptionId,
          });
        });
      } else {
        items.push({
          id: `rx-${rx.prescriptionId}`,
          department: 'Pharmacy',
          itemType: 'Medication',
          itemName: `Prescription: ${rx.drugCount || 1} Meds by ${formatDoctorName(rx.doctorName)}`,
          quantity: 1,
          unitPrice: rx.totalAmount,
          totalPrice: rx.totalAmount,
          referenceId: rx.prescriptionId,
        });
      }
      return items;
    };

    it('expands multi-drug prescriptions into discrete, itemized billable rows', () => {
      const sampleRx = {
        prescriptionId: 'RX-901',
        doctorName: 'Dr. Ayesha Siddiqui',
        drugs: [
          { name: 'Augmentin', dosage: '625mg', qtyNeeded: 2, unitPrice: 450, totalPrice: 900 },
          { name: 'Panadol Extra', dosage: '500mg', qtyNeeded: 3, unitPrice: 50, totalPrice: 150 },
          { name: 'Nexum', dosage: '40mg', qtyNeeded: 1, unitPrice: 677.1, totalPrice: 677.1 },
        ],
        totalAmount: 1727.1,
      };

      const lineItems = itemizePrescriptionForCart(sampleRx);
      expect(lineItems).toHaveLength(3);

      expect(lineItems[0].itemName).toBe('Augmentin (625mg) - Dr. Ayesha Siddiqui');
      expect(lineItems[0].quantity).toBe(2);
      expect(lineItems[0].unitPrice).toBe(450);
      expect(lineItems[0].totalPrice).toBe(900);
      expect(lineItems[0].department).toBe('Pharmacy');

      expect(lineItems[1].itemName).toBe('Panadol Extra (500mg) - Dr. Ayesha Siddiqui');
      expect(lineItems[1].quantity).toBe(3);
      expect(lineItems[1].totalPrice).toBe(150);

      expect(lineItems[2].itemName).toBe('Nexum (40mg) - Dr. Ayesha Siddiqui');
      expect(lineItems[2].quantity).toBe(1);
      expect(lineItems[2].totalPrice).toBe(677.1);

      const computedTotal = lineItems.reduce((acc, it) => acc + it.totalPrice, 0);
      expect(computedTotal).toBeCloseTo(1727.1, 1);
    });

    it('handles legacy or single prescriptions without drug breakdown gracefully', () => {
      const legacyRx = {
        prescriptionId: 'RX-801',
        doctorName: 'Dr. Tariq Mahmood',
        drugCount: 2,
        drugs: [],
        totalAmount: 1200,
      };

      const lineItems = itemizePrescriptionForCart(legacyRx);
      expect(lineItems).toHaveLength(1);
      expect(lineItems[0].itemName).toBe('Prescription: 2 Meds by Dr. Tariq Mahmood');
      expect(lineItems[0].totalPrice).toBe(1200);
      expect(lineItems[0].quantity).toBe(1);
    });
  });

  // =========================================================================
  // 4. DIAGNOSTIC LABORATORY SCENARIOS
  // =========================================================================
  describe('Diagnostic Laboratory (Test Orders & Priority Pricing)', () => {
    const processLabOrders = (labOrders, paidOrderIds = new Set(), billedRefIds = new Set()) => {
      return labOrders
        .filter((order) => !['Cancelled', 'Specimen Rejected'].includes(order.status))
        .filter((order) => !paidOrderIds.has(order.orderId) && !billedRefIds.has(order.orderId))
        .map((order) => ({
          orderId: order.orderId,
          testName: order.testName,
          priority: order.priority || 'Routine',
          doctorName: order.doctorName || 'Pathologist',
          date: order.date,
          fee: order.priority === 'Emergency' ? 1200 : 800,
        }));
    };

    it('identifies unbilled routine and emergency lab orders with appropriate pricing', () => {
      const orders = [
        { orderId: 'REQ-301', testName: 'Complete Blood Count (CBC)', priority: 'Routine', status: 'Pending' },
        { orderId: 'REQ-302', testName: 'Troponin-I Cardiac Marker', priority: 'Emergency', status: 'In Analysis' },
      ];

      const pending = processLabOrders(orders);
      expect(pending).toHaveLength(2);
      expect(pending[0].testName).toBe('Complete Blood Count (CBC)');
      expect(pending[0].fee).toBe(800);
      expect(pending[1].testName).toBe('Troponin-I Cardiac Marker');
      expect(pending[1].fee).toBe(1200);
    });

    it('filters out lab orders already settled in LabInvoice or HospitalInvoice', () => {
      const orders = [
        { orderId: 'REQ-401', testName: 'Serum Creatinine', priority: 'Routine', status: 'Completed' },
        { orderId: 'REQ-402', testName: 'Liver Function Test (LFT)', priority: 'Routine', status: 'Completed' },
      ];

      const paidInLab = new Set(['REQ-401']);
      const pending = processLabOrders(orders, paidInLab);
      expect(pending).toHaveLength(1);
      expect(pending[0].orderId).toBe('REQ-402');
    });
  });

  // =========================================================================
  // 5. MERGED VS SEPARATE ROUTING SCENARIOS
  // =========================================================================
  describe('Hospital Department Billing Routing Matrix', () => {
    const evaluateRouting = (callerDept, config) => {
      const callerKey = callerDept.toLowerCase();
      const callerCfg = config[callerKey] || { enabled: true, mode: 'separate', isFinal: false };

      const canBillReception =
        callerKey === 'reception' ||
        (callerCfg.mode === 'merged' && callerCfg.isFinal && config.reception?.mode === 'merged');

      const canBillPharmacy =
        callerKey === 'pharmacy' ||
        (callerCfg.mode === 'merged' && callerCfg.isFinal && config.pharmacy?.mode === 'merged');

      const canBillLaboratory =
        callerKey === 'laboratory' ||
        (callerCfg.mode === 'merged' && callerCfg.isFinal && config.laboratory?.mode === 'merged');

      return { canBillReception, canBillPharmacy, canBillLaboratory };
    };

    it('Scenario 1: Standard Hospital Setup (Reception Merged & Final Desk, Pharmacy Merged, Lab Separate)', () => {
      const config = {
        reception: { enabled: true, mode: 'merged', isFinal: true },
        pharmacy: { enabled: true, mode: 'merged', isFinal: false },
        laboratory: { enabled: true, mode: 'separate', isFinal: false },
      };

      const reception = evaluateRouting('Reception', config);
      expect(reception.canBillReception).toBe(true);
      expect(reception.canBillPharmacy).toBe(true);
      expect(reception.canBillLaboratory).toBe(false);

      const pharmacy = evaluateRouting('Pharmacy', config);
      expect(pharmacy.canBillPharmacy).toBe(true);
      expect(pharmacy.canBillReception).toBe(false);
      expect(pharmacy.canBillLaboratory).toBe(false);

      const laboratory = evaluateRouting('Laboratory', config);
      expect(laboratory.canBillLaboratory).toBe(true);
      expect(laboratory.canBillReception).toBe(false);
      expect(laboratory.canBillPharmacy).toBe(false);
    });

    it('Scenario 2: Pharmacy Final Settlement Desk (Pharmacy Merged & Final, Reception Merged, Lab Separate)', () => {
      const config = {
        reception: { enabled: true, mode: 'merged', isFinal: false },
        pharmacy: { enabled: true, mode: 'merged', isFinal: true },
        laboratory: { enabled: true, mode: 'separate', isFinal: false },
      };

      const pharmacy = evaluateRouting('Pharmacy', config);
      expect(pharmacy.canBillReception).toBe(true);
      expect(pharmacy.canBillPharmacy).toBe(true);
      expect(pharmacy.canBillLaboratory).toBe(false);
    });

    it('Scenario 3: Fully Consolidated Master Cashier (All Three Merged, Reception Final)', () => {
      const config = {
        reception: { enabled: true, mode: 'merged', isFinal: true },
        pharmacy: { enabled: true, mode: 'merged', isFinal: false },
        laboratory: { enabled: true, mode: 'merged', isFinal: false },
      };

      const reception = evaluateRouting('Reception', config);
      expect(reception.canBillReception).toBe(true);
      expect(reception.canBillPharmacy).toBe(true);
      expect(reception.canBillLaboratory).toBe(true);
    });

    it('Scenario 4: Fully Decentralized (All Departments Separate, No Final Desk)', () => {
      const config = {
        reception: { enabled: true, mode: 'separate', isFinal: false },
        pharmacy: { enabled: true, mode: 'separate', isFinal: false },
        laboratory: { enabled: true, mode: 'separate', isFinal: false },
      };

      const rec = evaluateRouting('Reception', config);
      expect(rec.canBillReception).toBe(true);
      expect(rec.canBillPharmacy).toBe(false);
      expect(rec.canBillLaboratory).toBe(false);

      const phm = evaluateRouting('Pharmacy', config);
      expect(phm.canBillReception).toBe(false);
      expect(phm.canBillPharmacy).toBe(true);
      expect(phm.canBillLaboratory).toBe(false);

      const lab = evaluateRouting('Laboratory', config);
      expect(lab.canBillReception).toBe(false);
      expect(lab.canBillPharmacy).toBe(false);
      expect(lab.canBillLaboratory).toBe(true);
    });
  });

  // =========================================================================
  // 6. EMERGENCY CONTACT FORMATTING SAFETY (REACT CHILD CRASH PREVENTION)
  // =========================================================================
  describe('Emergency Contact Safe Formatting (Prevent React Child Object Exception)', () => {
    const formatEmergencyContact = (contact, emergencyPhone = '') => {
      if (!contact && !emergencyPhone) return 'N/A';
      if (typeof contact === 'object' && contact !== null) {
        const name = contact.name || 'Contact';
        const relation = contact.relation ? ` (${contact.relation})` : '';
        const phone = contact.phone || emergencyPhone;
        const phoneStr = phone ? ` • ${phone}` : '';
        return `${name}${relation}${phoneStr}`;
      }
      const phoneStr = emergencyPhone ? ` • ${emergencyPhone}` : '';
      return `${contact}${phoneStr}`;
    };

    it('safely formats MongoDB object emergencyContact with name, relation, and phone', () => {
      const objContact = {
        name: 'Rashid Mahmood',
        relation: 'Brother',
        phone: '03001234567',
      };

      const formatted = formatEmergencyContact(objContact);
      expect(typeof formatted).toBe('string');
      expect(formatted).toBe('Rashid Mahmood (Brother) • 03001234567');
    });

    it('safely formats raw string emergencyContact without throwing', () => {
      const strContact = 'Rashid Mahmood';
      const formatted = formatEmergencyContact(strContact, '03001234567');
      expect(typeof formatted).toBe('string');
      expect(formatted).toBe('Rashid Mahmood • 03001234567');
    });

    it('returns N/A safely when emergency contact is null, undefined, or empty', () => {
      expect(formatEmergencyContact(null)).toBe('N/A');
      expect(formatEmergencyContact(undefined)).toBe('N/A');
      expect(formatEmergencyContact('', '')).toBe('N/A');
    });
  });

  // =========================================================================
  // 7. INVOICE MODEL INTEGRATION & THERMAL RECEIPT CALCULATIONS
  // =========================================================================
  describe('HospitalInvoice Model & Receipt Integrity', () => {
    it('creates an itemized hospital invoice containing IPD, OPD, Pharmacy, and Lab lines', () => {
      const invoice = new HospitalInvoice({
        invoiceId: 'INV-2026',
        patientId: 'PAT-009',
        patientName: 'Fatima Zahra',
        patientPhone: '03001122334',
        issuedDepartment: 'Reception',
        items: [
          {
            department: 'Reception',
            itemType: 'Bed Stay',
            name: 'Inpatient Stay: General Ward (Bed 02) - 3 Day(s) @ Rs. 1500/day',
            itemName: 'Inpatient Stay: General Ward (Bed 02) - 3 Day(s) @ Rs. 1500/day',
            quantity: 3,
            unitPrice: 1500,
            totalPrice: 4500,
            referenceId: 'ADM-009',
          },
          {
            department: 'Reception',
            itemType: 'Consultation',
            name: 'Doctor Consultation: Dr. Tariq Mahmood (Cardiology)',
            itemName: 'Doctor Consultation: Dr. Tariq Mahmood (Cardiology)',
            quantity: 1,
            unitPrice: 1500,
            totalPrice: 1500,
            referenceId: 'APT-009',
          },
          {
            department: 'Pharmacy',
            itemType: 'Medication',
            name: 'Augmentin 625mg (14 tabs) - Dr. Tariq Mahmood',
            itemName: 'Augmentin 625mg (14 tabs) - Dr. Tariq Mahmood',
            quantity: 2,
            unitPrice: 450,
            totalPrice: 900,
            referenceId: 'RX-009',
          },
          {
            department: 'Laboratory',
            itemType: 'Diagnostic Test',
            name: 'Diagnostic Lab: Complete Blood Count (Routine)',
            itemName: 'Diagnostic Lab: Complete Blood Count (Routine)',
            quantity: 1,
            unitPrice: 800,
            totalPrice: 800,
            referenceId: 'REQ-009',
          },
        ],
        subtotal: 7700,
        discount: 200,
        totalAmount: 7500,
        paidAmount: 7500,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        collectedBy: 'Fatima Zahra (Receptionist)',
      });

      expect(invoice.invoiceId).toBe('INV-2026');
      expect(invoice.items).toHaveLength(4);
      expect(invoice.subtotal).toBe(7700);
      expect(invoice.discount).toBe(200);
      expect(invoice.totalAmount).toBe(7500);

      // Verify each department line
      const ipdLine = invoice.items.find((it) => it.itemType === 'Bed Stay');
      expect(ipdLine).toBeDefined();
      expect(ipdLine.totalPrice).toBe(4500);

      const opdLine = invoice.items.find((it) => it.itemType === 'Consultation');
      expect(opdLine).toBeDefined();
      expect(opdLine.totalPrice).toBe(1500);

      const rxLine = invoice.items.find((it) => it.itemType === 'Medication');
      expect(rxLine).toBeDefined();
      expect(rxLine.quantity).toBe(2);
      expect(rxLine.unitPrice).toBe(450);
      expect(rxLine.totalPrice).toBe(900);

      const labLine = invoice.items.find((it) => it.itemType === 'Diagnostic Test');
      expect(labLine).toBeDefined();
      expect(labLine.totalPrice).toBe(800);
    });

    it('creates an invoice from Pharmacy Billing Counter with itemized drugs and validates AuditLog schema compliance', () => {
      const rxInvoice = new HospitalInvoice({
        invoiceId: 'INV-3001',
        patientId: 'PAT-001',
        patientName: 'Muhammad Ali',
        patientPhone: '03002345678',
        issuedDepartment: 'Pharmacy',
        items: [
          {
            department: 'Pharmacy',
            itemType: 'Medication',
            name: 'Loprin 75mg (75mg) - Dr. Ayesha Siddiqui',
            itemName: 'Loprin 75mg (75mg) - Dr. Ayesha Siddiqui',
            quantity: 30,
            unitPrice: 3,
            totalPrice: 90,
            referenceId: 'RX-001',
          },
          {
            department: 'Pharmacy',
            itemType: 'Medication',
            name: 'Lipiget 20mg (20mg) - Dr. Ayesha Siddiqui',
            itemName: 'Lipiget 20mg (20mg) - Dr. Ayesha Siddiqui',
            quantity: 30,
            unitPrice: 36,
            totalPrice: 1080,
            referenceId: 'RX-001',
          },
          {
            department: 'Pharmacy',
            itemType: 'Medication',
            name: 'Nexum 40mg (40mg) - Dr. Ayesha Siddiqui',
            itemName: 'Nexum 40mg (40mg) - Dr. Ayesha Siddiqui',
            quantity: 14,
            unitPrice: 39.79,
            totalPrice: 557.1,
            referenceId: 'RX-001',
          },
        ],
        subtotal: 1727.1,
        discount: 0,
        totalAmount: 1727.1,
        paidAmount: 1727.1,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        collectedBy: 'Zahid Khan (Pharmacist)',
        cashierRole: 'pharmacist',
      });

      expect(rxInvoice.invoiceId).toBe('INV-3001');
      expect(rxInvoice.issuedDepartment).toBe('Pharmacy');
      expect(rxInvoice.items).toHaveLength(3);
      expect(rxInvoice.totalAmount).toBe(1727.1);
      expect(rxInvoice.collectedBy).toBe('Zahid Khan (Pharmacist)');

      // Verify AuditLog record matches schema specifications
      const auditEntry = new AuditLog({
        action: 'BILLING',
        module: 'Billing',
        description: `Issued hospital invoice ${rxInvoice.invoiceId} for ${rxInvoice.patientName} (${rxInvoice.patientId}) - Rs. ${rxInvoice.totalAmount}`,
        user: rxInvoice.collectedBy,
        userRole: rxInvoice.cashierRole,
        ip: '127.0.0.1',
        alert: false,
      });

      expect(auditEntry.action).toBe('BILLING');
      expect(auditEntry.module).toBe('Billing');
      expect(auditEntry.user).toBe('Zahid Khan (Pharmacist)');
      const valError = auditEntry.validateSync();
      expect(valError).toBeUndefined();
    });
  });
});
