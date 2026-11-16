import { NextResponse } from 'next/server';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import { isSmtpConfigured, getEmailTransporter } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/notifications/test-email
 * Checks current SMTP configuration status
 */
export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    const configured = isSmtpConfigured();
    const service = process.env.SMTP_SERVICE || '';
    const host = process.env.SMTP_HOST || '';
    const port = process.env.SMTP_PORT || '587';
    const user = process.env.SMTP_USER || '';
    const from = process.env.SMTP_FROM || (user ? `"RoleMed Healthcare" <${user}>` : '"RoleMed Healthcare" <notifications@rolemed.org>');

    return NextResponse.json({
      success: true,
      configured,
      service: service || (host.includes('gmail') ? 'gmail' : 'custom'),
      host: host || (service === 'gmail' ? 'smtp.gmail.com' : 'Not configured'),
      port,
      user: user ? `${user.slice(0, 3)}***@${user.split('@')[1] || ''}` : '',
      from,
    });
  } catch (error) {
    return handleApiError(error, 'Error inspecting email configuration');
  }
}

/**
 * POST /api/notifications/test-email
 * Sends a live verification email to test SMTP credentials
 */
export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const { to } = body;

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid recipient email address is required (e.g. user@example.com).' },
        { status: 400 }
      );
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error: 'SMTP credentials are not configured in .env.local.',
          guide: {
            title: 'How to enable real email delivery with Gmail or SMTP:',
            steps: [
              '1. Open your .env.local file in the project root.',
              '2. For Gmail: Add SMTP_SERVICE=gmail, SMTP_USER=your_email@gmail.com, and SMTP_PASS=your_16_char_app_password (generated from Google Account > Security > 2-Step Verification > App Passwords).',
              '3. For Custom SMTP (e.g. Mailtrap, Outlook, Brevo): Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.',
              '4. Restart your application dev server.',
            ],
          },
        },
        { status: 400 }
      );
    }

    const transporter = getEmailTransporter();
    if (!transporter) {
      return NextResponse.json(
        { success: false, error: 'Could not initialize email transporter with provided configuration.' },
        { status: 500 }
      );
    }

    // 1. Verify connection
    await transporter.verify();

    // 2. Send live verification test email
    const from = process.env.SMTP_FROM || `"RoleMed Healthcare" <${process.env.SMTP_USER}>`;
    const info = await transporter.sendMail({
      from,
      to: to.trim().toLowerCase(),
      subject: '🩺 RoleMed Hospital — Live SMTP Delivery Verification',
      text: `This is a live test email from RoleMed Hospital Management System sent to ${to}. Your SMTP transport is verified and operational!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0284c7; margin-top: 0;">🩺 RoleMed Healthcare System</h2>
          <p style="font-size: 15px; color: #1e293b;"><strong>Live SMTP Delivery Verification</strong></p>
          <p style="font-size: 14px; color: #475569;">Congratulations! Your hospital communications engine is successfully connected and capable of sending automated emails to patients, physicians, and clinical staff.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 0; color: #166534; font-size: 13px;"><strong>Status:</strong> Active &amp; Verified</p>
            <p style="margin: 4px 0 0; color: #166534; font-size: 13px;"><strong>Recipient:</strong> ${to}</p>
            <p style="margin: 4px 0 0; color: #166534; font-size: 13px;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">RoleMed RB-HMS • Automated Communications Subsystem</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      configured: true,
      message: `Test email successfully sent to ${to}`,
      messageId: info.messageId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `SMTP Verification Failed: ${error.message || 'Unknown network/authentication error'}`,
        details: error.code || error.command || 'Check your SMTP_USER and SMTP_PASS in .env.local',
      },
      { status: 500 }
    );
  }
}
