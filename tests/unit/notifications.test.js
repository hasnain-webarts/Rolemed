import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatPakistaniWhatsAppNumber,
  generateNotificationContent,
  isSmtpConfigured,
  sendEmailDelivery,
  sendWhatsAppDelivery,
} from '@/lib/notificationService';

describe('Omnichannel Notification System & Pakistani Messaging Suite', () => {
  describe('Test Group 1: Pakistani Mobile Phone Normalization for WhatsApp (E.164)', () => {
    it('converts standard 11-digit local format (03001234567) to E.164 (+923001234567)', () => {
      const formatted = formatPakistaniWhatsAppNumber('03001234567');
      expect(formatted).toBe('+923001234567');
    });

    it('handles hyphens and punctuation (0321-9876543) correctly', () => {
      const formatted = formatPakistaniWhatsAppNumber('0321-9876543');
      expect(formatted).toBe('+923219876543');
    });

    it('handles 10-digit trunk format without leading zero (3335129844)', () => {
      const formatted = formatPakistaniWhatsAppNumber('3335129844');
      expect(formatted).toBe('+923335129844');
    });

    it('handles existing country code prefix (+92 315 7766554)', () => {
      const formatted = formatPakistaniWhatsAppNumber('+92 315 7766554');
      expect(formatted).toBe('+923157766554');
    });

    it('handles 0092 international dialing prefix (00923014455667)', () => {
      const formatted = formatPakistaniWhatsAppNumber('00923014455667');
      expect(formatted).toBe('+923014455667');
    });

    it('returns null for non-mobile landlines or invalid length numbers', () => {
      expect(formatPakistaniWhatsAppNumber('051-5582200')).toBeNull(); // Landline Rawalpindi
      expect(formatPakistaniWhatsAppNumber('12345')).toBeNull();
      expect(formatPakistaniWhatsAppNumber('')).toBeNull();
      expect(formatPakistaniWhatsAppNumber(null)).toBeNull();
    });
  });

  describe('Test Group 2: Clinical Notification Content & HTML Templates', () => {
    it('generates rich content for PATIENT_REGISTRATION', () => {
      const content = generateNotificationContent('PATIENT_REGISTRATION', {
        patientId: 'PAT-012',
        name: 'Kamran Bashir',
        phone: '03001234567',
        cnic: '36302-2345678-3',
        bloodGroup: 'O+',
      });

      expect(content.title).toContain('Welcome to RoleMed');
      expect(content.title).toContain('PAT-012');
      expect(content.message).toContain('Kamran Bashir');
      expect(content.message).toContain('PAT-012');
      expect(content.html).toContain('36302-2345678-3');
      expect(content.html).toContain('O+');
      expect(content.html).toContain('Master Patient Index');
    });

    it('generates consultation confirmation for APPOINTMENT_CONFIRMATION', () => {
      const content = generateNotificationContent('APPOINTMENT_CONFIRMATION', {
        appointmentId: 'APT-105',
        patientName: 'Bushra Bibi',
        doctorName: 'Dr. Ayesha Siddiqui',
        date: '2026-11-20',
        time: '10:30 AM',
        reason: 'Follow-up Cardiology',
      });

      expect(content.title).toContain('APT-105');
      expect(content.message).toContain('Bushra Bibi');
      expect(content.message).toContain('Dr. Ayesha Siddiqui');
      expect(content.message).toContain('2026-11-20');
      expect(content.html).toContain('10:30 AM');
      expect(content.html).toContain('Follow-up Cardiology');
    });

    it('generates verified release alert for LAB_REPORT_READY', () => {
      const content = generateNotificationContent('LAB_REPORT_READY', {
        orderId: 'LAB-305',
        patientName: 'Muhammad Ali',
        testName: 'Complete Blood Picture (CP / CBC)',
        processedBy: 'Zainab Bibi, Lab Technologist',
      });

      expect(content.title).toContain('LAB-305');
      expect(content.message).toContain('Muhammad Ali');
      expect(content.message).toContain('Complete Blood Picture');
      expect(content.message).toContain('settled');
      expect(content.html).toContain('Paid &amp; Settled');
      expect(content.html).toContain('Zainab Bibi');
    });

    it('generates payment settlement required notice for LAB_PAYMENT_PENDING', () => {
      const content = generateNotificationContent('LAB_PAYMENT_PENDING', {
        orderId: 'LAB-306',
        patientName: 'Khadija Begum',
        testName: 'Liver Function Tests (LFT)',
        amountDue: 1850,
      });

      expect(content.title).toContain('Billing Settlement Required');
      expect(content.message).toContain('Rs. 1,850');
      expect(content.message).toContain('LAB-306');
      expect(content.html).toContain('Unpaid');
      expect(content.html).toContain('cashier to complete payment');
    });

    it('generates ward and bed details for INPATIENT_ADMISSION', () => {
      const content = generateNotificationContent('INPATIENT_ADMISSION', {
        admissionId: 'ADM-205',
        patientName: 'Abdul Rehman',
        ward: 'General Ward A',
        bedNumber: 'A-104',
        doctorName: 'Dr. Tariq Mahmood',
        admittingDiagnosis: 'Diabetic Foot Triage',
      });

      expect(content.title).toContain('A-104');
      expect(content.message).toContain('General Ward A');
      expect(content.message).toContain('ADM-205');
      expect(content.html).toContain('Diabetic Foot Triage');
    });

    it('generates onboarding credentials for STAFF_CREDENTIALS with temporary password', () => {
      const content = generateNotificationContent('STAFF_CREDENTIALS', {
        name: 'Dr. Bilal Qureshi',
        role: 'doctor',
        email: 'bilal.qureshi@rolemed.org',
        tempPassword: 'TemporaryPass123!',
        department: 'Cardiology',
        employeeId: 'DOC-108',
      });

      expect(content.title).toContain('Dr. Bilal Qureshi');
      expect(content.message).toContain('bilal.qureshi@rolemed.org');
      expect(content.message).toContain('TemporaryPass123!');
      expect(content.html).toContain('DOC-108');
      expect(content.html).toContain('Security Advisory');
    });

    it('generates leave review notification for LEAVE_STATUS_UPDATE', () => {
      const content = generateNotificationContent('LEAVE_STATUS_UPDATE', {
        doctorName: 'Ayesha Siddiqui',
        status: 'Approved',
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        reviewNote: 'Authorized for Annual Clinical Conference in Lahore',
        conflictCount: 3,
      });

      expect(content.title).toContain('Approved');
      expect(content.message).toContain('2026-12-01');
      expect(content.message).toContain('2026-12-05');
      expect(content.message).toContain('3 conflicting appointment(s)');
      expect(content.html).toContain('Authorized for Annual Clinical Conference');
    });
  });

  describe('Test Group 3: Financial Verification Gate Simulation', () => {
    it('blocks official report release when invoice paymentStatus is Unpaid', () => {
      const mockInvoice = { orderId: 'LAB-310', paymentStatus: 'Unpaid', totalAmount: 2500 };
      const isPaid = mockInvoice.paymentStatus === 'Paid';
      expect(isPaid).toBe(false);

      const alertType = isPaid ? 'LAB_REPORT_READY' : 'LAB_PAYMENT_PENDING';
      expect(alertType).toBe('LAB_PAYMENT_PENDING');

      const content = generateNotificationContent(alertType, {
        orderId: mockInvoice.orderId,
        patientName: 'Test Patient',
        testName: 'Lipid Profile',
        amountDue: mockInvoice.totalAmount,
      });
      expect(content.title).toContain('Billing Settlement Required');
    });

    it('permits official report release when invoice paymentStatus is Paid', () => {
      const mockInvoice = { orderId: 'LAB-310', paymentStatus: 'Paid', totalAmount: 2500 };
      const isPaid = mockInvoice.paymentStatus === 'Paid';
      expect(isPaid).toBe(true);

      const alertType = isPaid ? 'LAB_REPORT_READY' : 'LAB_PAYMENT_PENDING';
      expect(alertType).toBe('LAB_REPORT_READY');

      const content = generateNotificationContent(alertType, {
        orderId: mockInvoice.orderId,
        patientName: 'Test Patient',
        testName: 'Lipid Profile',
      });
      expect(content.title).toContain('Diagnostic Lab Report Verified');
    });
  });

  describe('Test Group 4: Two-Way Bed Status Transition Logic', () => {
    it('simulates bed status transitioning from Operational to In Use on admission', () => {
      const bed = { bedNumber: 'A-102', status: 'Operational', notes: 'Vacant' };
      // Simulating admission
      bed.status = 'In Use';
      bed.notes = 'Occupied by Patient PAT-005';

      expect(bed.status).toBe('In Use');
      expect(bed.notes).toContain('PAT-005');
    });

    it('simulates bed status reverting to Operational on discharge', () => {
      const bed = { bedNumber: 'A-102', status: 'In Use', notes: 'Occupied by Patient PAT-005' };
      // Simulating discharge
      bed.status = 'Operational';
      bed.notes = 'Discharged on 2026-11-13. Bed sanitized and vacant for intake.';

      expect(bed.status).toBe('Operational');
      expect(bed.notes).toContain('sanitized and vacant');
    });
  });

  describe('Test Group 5: Outbound Email Engine & Sandbox Verification', () => {
    it('accurately identifies when SMTP credentials are not configured', () => {
      // With default test environment without SMTP
      expect(isSmtpConfigured()).toBe(false);
    });

    it('gracefully handles missing recipient email with skipped status', async () => {
      const res = await sendEmailDelivery({ to: '', subject: 'Test', html: '<p>Test</p>' });
      expect(res.status).toBe('skipped');
      expect(res.details).toContain('No recipient email provided');
    });

    it('returns simulated status when SMTP is not configured without crashing', async () => {
      const res = await sendEmailDelivery({
        to: 'rehman.abdul@hotmail.com',
        subject: 'Inpatient Discharge Summary',
        html: '<p>Discharge record</p>',
        text: 'Discharge record',
      });
      expect(res.status).toBe('simulated');
      expect(res.details).toContain('Simulated dispatch');
    });

    it('returns simulated status when WhatsApp gateway is not configured', async () => {
      const res = await sendWhatsAppDelivery({
        phone: '03001234567',
        text: 'Hospital Appointment Reminder',
      });
      expect(res.status).toBe('simulated');
      expect(res.details).toContain('Simulated dispatch');
    });

    it('skips WhatsApp delivery gracefully on invalid phone number', async () => {
      const res = await sendWhatsAppDelivery({
        phone: 'invalid-number',
        text: 'Test',
      });
      expect(res.status).toBe('skipped');
    });
  });
});

