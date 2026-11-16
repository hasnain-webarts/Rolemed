import connectDB from '@/db/connectDB';
import Notification from '@/models/Notification';
import nodemailer from 'nodemailer';

/**
 * Pakistani E.164 Mobile Number Normalization for WhatsApp Delivery
 * Converts "03001234567", "0300-1234567", "+92 300 1234567" into "+923001234567"
 * @param {string} phone
 * @returns {string|null} E.164 formatted string or null if invalid
 */
export function formatPakistaniWhatsAppNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('0092')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('92') && digits.length >= 11) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Authentic Pakistani mobile codes always start with 3 (e.g. 300, 301, 321, 333, 345, 315) and are 10 digits
  if (digits.startsWith('3') && digits.length === 10) {
    return `+92${digits}`;
  }

  return null;
}

/**
 * Hospital Email Layout Wrapper
 */
function wrapEmailHtml(title, bodyHtml, footerNote = '') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0284c7; padding: 24px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; color: #334155; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-blue { background: #e0f2fe; color: #0369a1; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    .badge-purple { background: #f3e8ff; color: #7e22ce; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0; }
    .footer { background: #f1f5f9; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
    .button { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 10px 20px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 13px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🩺 RoleMed Healthcare System</h1>
      <p>Automated Hospital Communication Service</p>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px;">RoleMed RB-HMS • Hospital Management & Clinical Operations</p>
      <p style="margin: 0;">${footerNote || 'This is an automated operational notification. Please do not reply directly to this message.'}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Builds standard content for clinical hospital notifications
 */
export function generateNotificationContent(type, data = {}) {
  switch (type) {
    case 'PATIENT_REGISTRATION': {
      const patientId = data.patientId || 'PAT-000';
      const name = data.name || 'Valued Patient';
      const title = `Welcome to RoleMed Hospital — Patient ID: ${patientId}`;
      const message = `Dear ${name}, welcome to RoleMed Hospital. Your registered Master Patient Index ID is ${patientId}. Please present this ID for OPD appointments, prescriptions, and diagnostic labs.`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge badge-blue">New Patient Registration</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Welcome to RoleMed Hospital</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Your electronic medical record profile has been successfully registered in our clinical management system.</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Master Patient Index (MPI) ID:</strong> <span style="font-family: monospace; font-size: 15px; color: #0284c7; font-weight: bold;">${patientId}</span></p>
            ${data.cnic ? `<p style="margin: 0 0 6px;"><strong>CNIC / Identity:</strong> ${data.cnic}</p>` : ''}
            ${data.bloodGroup ? `<p style="margin: 0 0 6px;"><strong>Blood Group:</strong> ${data.bloodGroup}</p>` : ''}
            <p style="margin: 0;"><strong>Registered Phone:</strong> ${data.phone || 'N/A'}</p>
          </div>
          <p style="font-size: 12px; color: #64748b;">Please quote your <strong>Patient ID (${patientId})</strong> when visiting our reception counters, OPD clinics, or pharmacy.</p>
        `
      );
      return { title, message, html };
    }

    case 'APPOINTMENT_CONFIRMATION': {
      const aptId = data.appointmentId || 'APT-000';
      const patientName = data.patientName || 'Patient';
      const doctorName = data.doctorName || 'Attending Specialist';
      const date = data.date || 'Scheduled Date';
      const time = data.time || 'Scheduled Time';
      const title = `Consultation Booked: ${aptId} with ${doctorName}`;
      const message = `Dear ${patientName}, your appointment (${aptId}) with ${doctorName} is confirmed for ${date} at ${time}. Sequential OPD Token has been allocated. Please arrive 15 minutes before your time slot.`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge badge-green">OPD Consultation Confirmed</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Clinical Appointment Scheduled</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Your outpatient consultation has been scheduled with our specialist.</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Appointment ID:</strong> <span style="font-family: monospace; color: #0284c7; font-weight: bold;">${aptId}</span></p>
            <p style="margin: 0 0 6px;"><strong>Attending Doctor:</strong> ${doctorName}</p>
            <p style="margin: 0 0 6px;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 0 0 6px;"><strong>Consultation Slot:</strong> ${time}</p>
            ${data.reason ? `<p style="margin: 0;"><strong>Reason for Visit:</strong> ${data.reason}</p>` : ''}
          </div>
          <p style="font-size: 12px; color: #64748b;">Please check in at the reception desk 15 minutes prior to your allocated time.</p>
        `
      );
      return { title, message, html };
    }

    case 'APPOINTMENT_RESCHEDULED': {
      const aptId = data.appointmentId || 'APT-000';
      const patientName = data.patientName || 'Patient';
      const doctorName = data.doctorName || 'Doctor';
      const title = `Schedule Update: Appointment ${aptId} Requires Rescheduling`;
      const message = `Dear ${patientName}, your appointment ${aptId} with ${doctorName} on ${data.date || 'the scheduled date'} requires rescheduling due to a doctor schedule adjustment. Please contact RoleMed reception or login to choose a new time slot.`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge badge-amber">Action Required: Reschedule Notice</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Appointment Reschedule Notice</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Due to clinical scheduling adjustments for <strong>${doctorName}</strong>, your appointment (<strong>${aptId}</strong>) on <strong>${data.date}</strong> has been flagged for rescheduling.</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Appointment ID:</strong> ${aptId}</p>
            <p style="margin: 0 0 6px;"><strong>Doctor:</strong> ${doctorName}</p>
            <p style="margin: 0;"><strong>Status:</strong> Reschedule Required</p>
          </div>
          <p>Please call our reception helpline or visit the hospital reception desk to select an alternative date and time.</p>
        `
      );
      return { title, message, html };
    }

    case 'LAB_REPORT_READY': {
      const orderId = data.orderId || 'LAB-000';
      const patientName = data.patientName || 'Patient';
      const testName = data.testName || 'Diagnostic Test';
      const title = `Diagnostic Lab Report Verified: Order ${orderId}`;
      const message = `Dear ${patientName}, your diagnostic laboratory report for "${testName}" (Order: ${orderId}) is verified and available. Your invoice has been settled. You may view your report via the patient portal or collect a printed copy from the laboratory desk.`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge badge-green">Fee Settled • Official Report Released</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Diagnostic Lab Results Ready</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Your laboratory test results have been analyzed, medically verified, and officially released.</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Order ID:</strong> <span style="font-family: monospace; color: #0284c7; font-weight: bold;">${orderId}</span></p>
            <p style="margin: 0 0 6px;"><strong>Test Performed:</strong> ${testName}</p>
            ${data.specimenType ? `<p style="margin: 0 0 6px;"><strong>Specimen:</strong> ${data.specimenType}</p>` : ''}
            <p style="margin: 0 0 6px;"><strong>Billing Verification:</strong> <span style="color: #15803d; font-weight: bold;">Paid &amp; Settled</span></p>
            ${data.processedBy ? `<p style="margin: 0;"><strong>Verified By:</strong> ${data.processedBy}</p>` : ''}
          </div>
          <p style="font-size: 12px; color: #64748b;">You may review this report with your attending physician or download the official copy from your patient records.</p>
        `
      );
      return { title, message, html };
    }

    case 'LAB_PAYMENT_PENDING': {
      const orderId = data.orderId || 'LAB-000';
      const patientName = data.patientName || 'Patient';
      const testName = data.testName || 'Diagnostic Test';
      const amountDue = data.amountDue !== undefined ? `Rs. ${Number(data.amountDue).toLocaleString()}` : 'Pending Fee';
      const title = `Lab Results Completed — Billing Settlement Required (Order ${orderId})`;
      const message = `Dear ${patientName}, your diagnostic lab test for "${testName}" (Order: ${orderId}) has been analyzed and completed. Please settle the pending invoice (${amountDue}) at the hospital billing desk to access and release your official diagnostic report.`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge badge-amber">Billing Settlement Pending</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Diagnostic Results Ready — Payment Required</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Your laboratory examination for <strong>${testName}</strong> (Order <strong>${orderId}</strong>) has been completed by our laboratory technologists.</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Diagnostic Test:</strong> ${testName}</p>
            <p style="margin: 0 0 6px;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="margin: 0 0 6px;"><strong>Outstanding Balance:</strong> <strong style="color: #b45309;">${amountDue}</strong></p>
            <p style="margin: 0;"><strong>Invoice Status:</strong> Unpaid</p>
          </div>
          <p>As per hospital policy, official diagnostic reports are released upon invoice payment settlement. Please visit the laboratory billing cashier to complete payment.</p>
        `
      );
      return { title, message, html };
    }

    case 'INPATIENT_ADMISSION': {
      const admId = data.admissionId || 'ADM-000';
      const patientName = data.patientName || 'Patient';
      const ward = data.ward || 'General Ward';
      const bedNumber = data.bedNumber || 'Bed';
      const doctorName = data.doctorName || 'Attending Physician';
      const title = `Inpatient Admission Confirmed: ${patientName} (${ward} - Bed ${bedNumber})`;
      const message = `Inpatient admission confirmed for ${patientName} (Admission: ${admId}). Allocated Ward: ${ward}, Bed Number: ${bedNumber}. Attending Physician: ${doctorName}. Diagnosis: ${data.admittingDiagnosis || 'Clinical Stabilization'}.`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge badge-purple">Inpatient Ward Intake</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Inpatient Admission Confirmation</h2>
          <p>Inpatient admission details for <strong>${patientName}</strong>:</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Admission ID:</strong> <span style="font-family: monospace; color: #0284c7; font-weight: bold;">${admId}</span></p>
            <p style="margin: 0 0 6px;"><strong>Target Ward:</strong> ${ward}</p>
            <p style="margin: 0 0 6px;"><strong>Allocated Bed Number:</strong> <span style="font-weight: bold; color: #7e22ce;">${bedNumber}</span></p>
            <p style="margin: 0 0 6px;"><strong>Attending Physician:</strong> ${doctorName}</p>
            <p style="margin: 0;"><strong>Admitting Diagnosis:</strong> ${data.admittingDiagnosis || 'Clinical Observation'}</p>
          </div>
        `
      );
      return { title, message, html };
    }

    case 'INPATIENT_DISCHARGE': {
      const admId = data.admissionId || 'ADM-000';
      const patientName = data.patientName || 'Patient';
      const title = `Inpatient Discharge Summary: ${patientName} (${admId})`;
      const message = `Discharge completed for ${patientName} (${data.patientId || ''}) from ${data.ward || 'Ward'} (Bed ${data.bedNumber || ''}). Bed has been sanitized and reverted to Operational status.`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge badge-blue">Discharge Summary</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Patient Discharge Completed</h2>
          <p>Discharge record for <strong>${patientName}</strong>:</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Admission Reference:</strong> ${admId}</p>
            <p style="margin: 0 0 6px;"><strong>Discharged From:</strong> ${data.ward} (Bed ${data.bedNumber})</p>
            <p style="margin: 0;"><strong>Discharge Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>Please adhere to prescribed follow-up instructions and post-discharge medications.</p>
        `
      );
      return { title, message, html };
    }

    case 'STAFF_CREDENTIALS': {
      const name = data.name || 'Medical Staff';
      const role = data.role || 'Staff';
      const email = data.email || '';
      const tempPassword = data.tempPassword || 'RoleMed2026!';
      const title = `RoleMed Clinical Portal Access: Account Credentials for ${name}`;
      const message = `Welcome to RoleMed Medical Staff, ${name}. Your staff account (${role}) has been provisioned. Login Email: ${email}, Temporary Password: ${tempPassword}. Please login at /login and update your password immediately.`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge badge-blue">Staff Onboarding &amp; Credentials</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Welcome to RoleMed Healthcare</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Your institutional user account has been provisioned by the Hospital Administration.</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Staff Role:</strong> <span style="text-transform: capitalize; font-weight: bold;">${role}</span></p>
            ${data.department ? `<p style="margin: 0 0 6px;"><strong>Department:</strong> ${data.department}</p>` : ''}
            <p style="margin: 0 0 6px;"><strong>Login Email:</strong> <span style="font-family: monospace; font-weight: bold;">${email}</span></p>
            <p style="margin: 0 0 6px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${tempPassword}</span></p>
            ${data.employeeId ? `<p style="margin: 0;"><strong>Employee ID:</strong> ${data.employeeId}</p>` : ''}
          </div>
          <p style="color: #b45309; font-size: 12px;"><strong>Security Advisory:</strong> For patient safety and HIPAA/audit compliance, you must change your temporary password immediately upon your first sign-in.</p>
        `
      );
      return { title, message, html };
    }

    case 'LEAVE_STATUS_UPDATE': {
      const doctorName = data.doctorName || 'Doctor';
      const status = data.status || 'Reviewed';
      const isApproved = status.toLowerCase() === 'approved';
      const title = `Doctor Leave Request ${status}: ${data.startDate} to ${data.endDate}`;
      const message = `Dr. ${doctorName}, your leave request for ${data.startDate} to ${data.endDate} has been marked as "${status}". ${data.reviewNote ? `Admin remarks: ${data.reviewNote}.` : ''} ${data.conflictCount ? `Note: ${data.conflictCount} conflicting appointment(s) were flagged for rescheduling.` : ''}`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge ${isApproved ? 'badge-green' : 'badge-amber'}">Leave Request ${status}</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Leave Application Status Update</h2>
          <p>Dear <strong>Dr. ${doctorName}</strong>,</p>
          <p>Your hospital leave request has been reviewed by the Chief Medical Administrator.</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Leave Period:</strong> ${data.startDate} to ${data.endDate}</p>
            <p style="margin: 0 0 6px;"><strong>Status:</strong> <strong style="color: ${isApproved ? '#15803d' : '#b45309'};">${status}</strong></p>
            ${data.reason ? `<p style="margin: 0 0 6px;"><strong>Applied Reason:</strong> ${data.reason}</p>` : ''}
            ${data.reviewNote ? `<p style="margin: 0 0 6px;"><strong>Admin Review Note:</strong> ${data.reviewNote}</p>` : ''}
            ${data.conflictCount ? `<p style="margin: 0; color: #b45309;"><strong>Conflicting OPD Appointments Flagged:</strong> ${data.conflictCount}</p>` : ''}
          </div>
        `
      );
      return { title, message, html };
    }

    case 'EQUIPMENT_MAINTENANCE_DUE': {
      const assetId = data.assetId || 'EQP-000';
      const title = `Biomedical Alert: Maintenance Due for ${assetId} (${data.name || 'Medical Machine'})`;
      const message = `Biomedical machinery ${data.name || ''} [${assetId}] in ${data.department || 'Ward'} (${data.locationRoom || ''}) has reached its maintenance service threshold. Scheduled Date: ${data.dueDate || 'Immediate'}.`;
      const html = wrapEmailHtml(
        title,
        `
          <span class="badge badge-amber">Biomedical Engineering Alert</span>
          <h2 style="font-size: 18px; margin: 12px 0 8px; color: #0f172a;">Scheduled Equipment Maintenance Due</h2>
          <p>Biomedical asset maintenance notification:</p>
          <div class="card">
            <p style="margin: 0 0 6px;"><strong>Asset ID:</strong> <span style="font-family: monospace; font-weight: bold;">${assetId}</span></p>
            <p style="margin: 0 0 6px;"><strong>Equipment Name:</strong> ${data.name}</p>
            <p style="margin: 0 0 6px;"><strong>Department / Room:</strong> ${data.department} (${data.locationRoom || 'Main Bay'})</p>
            <p style="margin: 0 0 6px;"><strong>Assigned Engineer:</strong> ${data.assignedTechnician || 'Biomedical Lead'}</p>
            <p style="margin: 0;"><strong>Scheduled Due Date:</strong> ${data.dueDate || 'Immediate'}</p>
          </div>
          <p style="font-size: 12px; color: #64748b;">Please log the completed calibration or service in the Admin Equipment Fleet panel.</p>
        `
      );
      return { title, message, html };
    }

    default: {
      const title = data.title || 'RoleMed Hospital Notification';
      const message = data.message || 'You have received a clinical notification from RoleMed Hospital.';
      const html = wrapEmailHtml(title, `<p>${message}</p>`);
      return { title, message, html };
    }
  }
}

/**
 * Checks whether outbound SMTP email transport credentials are fully configured
 */
export function isSmtpConfigured() {
  const service = process.env.SMTP_SERVICE;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean((service || host) && user && pass);
}

/**
 * Creates and returns configured Nodemailer transport
 */
export function getEmailTransporter() {
  const service = process.env.SMTP_SERVICE;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  if (host) {
    const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;
    return nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.SMTP_IGNORE_TLS !== 'true',
      },
    });
  }

  return null;
}

/**
 * Dispatches an email via configured SMTP transport or falls back to simulated development outbox
 */
export async function sendEmailDelivery({ to, subject, html, text }) {
  if (!to) {
    return { status: 'skipped', details: 'No recipient email provided' };
  }

  const user = process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || (user ? `"RoleMed Healthcare" <${user}>` : '"RoleMed Healthcare" <notifications@rolemed.org>');

  if (isSmtpConfigured()) {
    try {
      const transporter = getEmailTransporter();
      if (!transporter) {
        throw new Error('Transporter initialization failed.');
      }

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      console.log(`[NotificationService Email] Live email delivered to ${to} (MessageId: ${info.messageId})`);
      return { status: 'sent', details: `SMTP messageId: ${info.messageId}` };
    } catch (err) {
      console.error('[NotificationService Email Error]:', err.message);
      return { status: 'failed', details: `SMTP Error: ${err.message}` };
    }
  }

  // Development / Sandbox Simulated Mode
  console.log(`[SIMULATED EMAIL OUTBOX] To: ${to} | Subject: "${subject}" (No SMTP configured)`);
  return { status: 'simulated', details: 'Simulated dispatch: SMTP credentials (SMTP_USER/SMTP_PASS) are not configured in .env.local' };
}

/**
 * Dispatches a WhatsApp message via configured WhatsApp API Gateway or falls back to simulated development sandbox
 */
async function sendWhatsAppDelivery({ phone, text }) {
  const e164 = formatPakistaniWhatsAppNumber(phone);
  if (!e164) {
    return { status: 'skipped', details: 'Invalid Pakistani mobile number for WhatsApp' };
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (twilioSid && twilioToken) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const params = new URLSearchParams();
      params.append('From', twilioFrom);
      params.append('To', `whatsapp:${e164}`);
      params.append('Body', text);

      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const json = await res.json();
      if (!res.ok) {
        return { status: 'failed', details: json.message || 'Twilio delivery failure' };
      }
      return { status: 'sent', details: `Twilio SID: ${json.sid}` };
    } catch (err) {
      console.error('[NotificationService WhatsApp Error]:', err.message);
      return { status: 'failed', details: err.message };
    }
  }

  // Development / Sandbox Simulated Mode
  console.log(`[SIMULATED WHATSAPP OUTBOX] To: ${e164} | Body: "${text.slice(0, 100)}..."`);
  return { status: 'sent', details: `Simulated dispatch to ${e164} (WhatsApp gateway not configured)` };
}

/**
 * Master Dispatch Notification Entry Point
 * Dispatches asynchronously to Email, WhatsApp, and In-App channels.
 * Guarantees that failures in third-party delivery do NOT throw or block calling routes.
 *
 * @param {Object} options
 * @param {string} options.recipientId - e.g. "PAT-001", "DOC-102", "admin"
 * @param {string} options.recipientRole - "patient" | "doctor" | "admin" | "receptionist" | "pharmacist" | "lab-technician"
 * @param {string} options.recipientName - e.g. "Muhammad Ali"
 * @param {string} [options.recipientEmail] - e.g. "patient@rolemed.org"
 * @param {string} [options.recipientPhone] - e.g. "03001234567"
 * @param {string} options.type - One of the valid notification types
 * @param {Object} [options.data] - Data payload for template rendering
 * @param {Array<string>} [options.channels] - ['email', 'whatsapp', 'in_app']
 * @param {Object} [options.metadata] - Extra entity metadata
 * @returns {Promise<Object>} Created Notification record
 */
export async function dispatchNotification({
  recipientId,
  recipientRole = 'patient',
  recipientName = 'Patient',
  recipientEmail = '',
  recipientPhone = '',
  type,
  data = {},
  channels = ['email', 'whatsapp', 'in_app'],
  metadata = {},
}) {
  try {
    await connectDB();

    const { title, message, html } = generateNotificationContent(type, data);
    const notificationId = await Notification.generateNextNotificationId();

    const notification = new Notification({
      notificationId,
      recipientId: String(recipientId),
      recipientRole,
      recipientName,
      recipientEmail: recipientEmail ? String(recipientEmail).trim().toLowerCase() : '',
      recipientPhone: recipientPhone ? String(recipientPhone).trim() : '',
      type,
      title,
      message,
      html,
      channels,
      metadata: { ...metadata, ...data },
      deliveryStatus: {
        email: channels.includes('email') ? 'pending' : 'skipped',
        whatsapp: channels.includes('whatsapp') ? 'pending' : 'skipped',
        inApp: channels.includes('in_app') ? 'unread' : 'skipped',
      },
    });

    // Execute third-party external network dispatches in parallel
    const deliveryPromises = [];

    if (channels.includes('email') && notification.recipientEmail) {
      deliveryPromises.push(
        sendEmailDelivery({
          to: notification.recipientEmail,
          subject: title,
          html,
          text: message,
        }).then((res) => {
          notification.deliveryStatus.email = res.status;
          if (res.status === 'failed' || res.status === 'simulated') {
            notification.errorDetails = res.details;
          }
        })
      );
    } else if (channels.includes('email')) {
      notification.deliveryStatus.email = 'skipped';
    }

    if (channels.includes('whatsapp') && notification.recipientPhone) {
      deliveryPromises.push(
        sendWhatsAppDelivery({
          phone: notification.recipientPhone,
          text: message,
        }).then((res) => {
          notification.deliveryStatus.whatsapp = res.status;
          if (res.status === 'failed' && !notification.errorDetails) {
            notification.errorDetails = res.details;
          }
        })
      );
    } else if (channels.includes('whatsapp')) {
      notification.deliveryStatus.whatsapp = 'skipped';
    }

    // Await with Promise.allSettled so no network throw stops database insertion
    await Promise.allSettled(deliveryPromises);

    await notification.save();
    return notification;
  } catch (error) {
    console.error('[NotificationService Master Dispatch Error]:', error);
    // Never rethrow to protect clinical transaction integrity
    return null;
  }
}

