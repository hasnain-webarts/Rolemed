import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import HospitalSetting from '@/models/HospitalSetting';
import AuditLog from '@/models/AuditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'receptionist', 'pharmacist', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const settings = await HospitalSetting.getSettings();

    return NextResponse.json(
      {
        success: true,
        settings,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Admin Billing Rules GET Error]:', error);
    return handleApiError(error, 'Failed to fetch hospital billing configuration');
  }
}

export async function PUT(req) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const body = await req.json();
    const {
      billingMode,
      enabledBillingDepartments,
      clearanceGate,
      pricingRules,
    } = body;

    const settings = await HospitalSetting.getSettings();

    if (billingMode) {
      settings.billingMode = billingMode;
    }

    if (enabledBillingDepartments && typeof enabledBillingDepartments === 'object') {
      settings.enabledBillingDepartments = {
        ...settings.enabledBillingDepartments.toObject(),
        ...enabledBillingDepartments,
      };
    }

    if (clearanceGate && typeof clearanceGate === 'object') {
      settings.clearanceGate = {
        ...settings.clearanceGate.toObject(),
        ...clearanceGate,
      };
    }

    if (pricingRules && typeof pricingRules === 'object') {
      settings.pricingRules = {
        ...settings.pricingRules.toObject(),
        ...pricingRules,
      };
    }

    settings.updatedBy = user?.name || 'Hospital Administrator';
    await settings.save();

    // Log the policy change in AuditLog
    try {
      await AuditLog.create({
        action: 'UPDATE',
        module: 'Billing',
        description: `Updated hospital billing rules to mode: ${settings.billingMode}`,
        user: user?.name || 'Administrator',
        userRole: user?.role || 'admin',
        alert: false,
      });
    } catch (auditErr) {
      console.warn('Could not record billing rule audit log:', auditErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Hospital billing policy successfully set to ${settings.billingMode} mode`,
        settings,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Admin Billing Rules PUT Error]:', error);
    return handleApiError(error, 'Failed to update hospital billing policy');
  }
}
