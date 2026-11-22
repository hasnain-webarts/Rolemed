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
      departmentBillingConfig,
      clearanceGate,
      pricingRules,
    } = body;

    const settings = await HospitalSetting.getSettings();

    if (billingMode) {
      settings.billingMode = billingMode;
    }

    if (departmentBillingConfig && typeof departmentBillingConfig === 'object') {
      const currentConfig = settings.departmentBillingConfig
        ? (settings.departmentBillingConfig.toObject ? settings.departmentBillingConfig.toObject() : settings.departmentBillingConfig)
        : {
            reception: { enabled: true, mode: 'merged', isFinal: true },
            pharmacy: { enabled: false, mode: 'merged', isFinal: false },
            laboratory: { enabled: false, mode: 'separate', isFinal: false },
          };

      const updated = {
        reception: { ...currentConfig.reception, ...(departmentBillingConfig.reception || {}) },
        pharmacy: { ...currentConfig.pharmacy, ...(departmentBillingConfig.pharmacy || {}) },
        laboratory: { ...currentConfig.laboratory, ...(departmentBillingConfig.laboratory || {}) },
      };

      // Ensure mode is either 'merged' or 'separate'
      ['reception', 'pharmacy', 'laboratory'].forEach((dept) => {
        if (!['merged', 'separate'].includes(updated[dept].mode)) {
          updated[dept].mode = 'separate';
        }
        // If mode is separate, isFinal CANNOT be true
        if (updated[dept].mode === 'separate') {
          updated[dept].isFinal = false;
        }
      });

      // Ensure at most ONE department is marked isFinal: true among merged departments
      let foundFinal = false;
      // If the incoming request explicitly toggled one to isFinal, prioritize that
      const requestedFinalDept = ['reception', 'pharmacy', 'laboratory'].find(
        (dept) => departmentBillingConfig[dept]?.isFinal === true && updated[dept].mode === 'merged'
      );

      ['reception', 'pharmacy', 'laboratory'].forEach((dept) => {
        if (requestedFinalDept) {
          updated[dept].isFinal = dept === requestedFinalDept;
        } else if (updated[dept].isFinal && updated[dept].mode === 'merged') {
          if (!foundFinal) {
            foundFinal = true;
          } else {
            updated[dept].isFinal = false;
          }
        } else {
          updated[dept].isFinal = false;
        }
      });

      // If any department is merged but none is final, default the first enabled merged dept to final
      const hasAnyMerged = Object.values(updated).some((c) => c.mode === 'merged');
      const hasAnyFinal = Object.values(updated).some((c) => c.isFinal === true);
      if (hasAnyMerged && !hasAnyFinal) {
        if (updated.reception.mode === 'merged') updated.reception.isFinal = true;
        else if (updated.pharmacy.mode === 'merged') updated.pharmacy.isFinal = true;
        else if (updated.laboratory.mode === 'merged') updated.laboratory.isFinal = true;
      }

      settings.departmentBillingConfig = updated;

      // Sync legacy enabledBillingDepartments
      settings.enabledBillingDepartments = {
        reception: Boolean(updated.reception.enabled),
        pharmacy: Boolean(updated.pharmacy.enabled),
        laboratory: Boolean(updated.laboratory.enabled),
      };
    } else if (enabledBillingDepartments && typeof enabledBillingDepartments === 'object') {
      settings.enabledBillingDepartments = {
        ...settings.enabledBillingDepartments.toObject(),
        ...enabledBillingDepartments,
      };
      if (settings.departmentBillingConfig) {
        if (enabledBillingDepartments.reception !== undefined) {
          settings.departmentBillingConfig.reception.enabled = Boolean(enabledBillingDepartments.reception);
        }
        if (enabledBillingDepartments.pharmacy !== undefined) {
          settings.departmentBillingConfig.pharmacy.enabled = Boolean(enabledBillingDepartments.pharmacy);
        }
        if (enabledBillingDepartments.laboratory !== undefined) {
          settings.departmentBillingConfig.laboratory.enabled = Boolean(enabledBillingDepartments.laboratory);
        }
      }
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
        description: `Updated hospital billing rules (Mode: ${settings.billingMode})`,
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
        message: `Hospital billing policy successfully updated`,
        settings,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Admin Billing Rules PUT Error]:', error);
    return handleApiError(error, 'Failed to update hospital billing policy');
  }
}
