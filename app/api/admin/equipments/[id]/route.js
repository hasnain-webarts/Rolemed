import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Equipment from '@/models/Equipment';
import AuditLog from '@/models/AuditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

function getAssetQuery(id) {
  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  if (isObjectId) {
    return {
      $or: [{ _id: id }, { assetId: id.toUpperCase().trim() }],
    };
  }
  return { assetId: id.toUpperCase().trim() };
}

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const equipment = await Equipment.findOne(getAssetQuery(id)).lean();

    if (!equipment) {
      return NextResponse.json(
        { success: false, error: `Equipment asset "${id}" not found` },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        equipment,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error fetching equipment details');
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const equipment = await Equipment.findOne(getAssetQuery(id));
    if (!equipment) {
      return NextResponse.json(
        { success: false, error: `Equipment asset "${id}" not found` },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const {
      status,
      condition,
      department,
      locationRoom,
      bedNumber,
      assignedTechnician,
      notes,
      newServiceLog,
      maintenanceIntervalDays,
    } = body;

    const previousStatus = equipment.status;
    let serviceLogged = false;

    if (status !== undefined) equipment.status = status;
    if (condition !== undefined) equipment.condition = condition;
    if (department !== undefined) equipment.department = department;
    if (locationRoom !== undefined) equipment.locationRoom = locationRoom;
    if (bedNumber !== undefined) equipment.bedNumber = bedNumber.trim().toUpperCase();
    if (assignedTechnician !== undefined) equipment.assignedTechnician = assignedTechnician;
    if (notes !== undefined) equipment.notes = notes;
    if (maintenanceIntervalDays !== undefined) {
      equipment.maintenanceIntervalDays = parseInt(maintenanceIntervalDays, 10) || 90;
    }

    // Process new maintenance servicing log
    if (newServiceLog && typeof newServiceLog === 'object') {
      const {
        serviceType = 'Routine Preventive Maintenance',
        technicianName = user.name || 'Biomedical Engineer',
        vendor = equipment.vendorName || 'In-House Maintenance',
        description = 'Standard routine inspection & calibration',
        costPkr = 0,
        partsReplaced = [],
        nextScheduled,
      } = newServiceLog;

      const serviceEntry = {
        serviceDate: new Date(),
        serviceType,
        technicianName: technicianName.trim(),
        vendor: vendor.trim(),
        description: description.trim(),
        costPkr: parseFloat(costPkr) || 0,
        partsReplaced: Array.isArray(partsReplaced) ? partsReplaced : [],
        nextServiceScheduled: nextScheduled ? new Date(nextScheduled) : undefined,
        loggedBy: user.name || 'Admin',
      };

      equipment.maintenanceHistory.unshift(serviceEntry);
      equipment.lastServicedDate = new Date();

      if (nextScheduled) {
        equipment.nextMaintenanceDate = new Date(nextScheduled);
      } else {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + (equipment.maintenanceIntervalDays || 90));
        equipment.nextMaintenanceDate = nextDate;
      }

      serviceLogged = true;
    }

    await equipment.save();

    // Log to AuditLog
    try {
      const description = serviceLogged
        ? `Logged maintenance service for ${equipment.assetId} (${equipment.name}): ${newServiceLog.serviceType}. Next scheduled: ${equipment.nextMaintenanceDate?.toISOString().split('T')[0]}`
        : `Updated asset ${equipment.assetId} (${equipment.name}). Status: ${previousStatus} -> ${equipment.status}, Dept: ${equipment.department}`;

      await AuditLog.create({
        action: 'UPDATE',
        module: 'Equipment',
        description,
        user: user.name || 'Chief Administrator',
        userId: user.id || null,
        userRole: user.role || 'admin',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });
    } catch (auditErr) {
      console.error('[Equipment PATCH] Audit log write warning:', auditErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: serviceLogged
          ? `Maintenance successfully logged for ${equipment.assetId}`
          : `Asset ${equipment.assetId} successfully updated`,
        equipment,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error updating equipment asset');
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    const equipment = await Equipment.findOne(getAssetQuery(id));
    if (!equipment) {
      return NextResponse.json(
        { success: false, error: `Equipment asset "${id}" not found` },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (permanent) {
      await Equipment.deleteOne({ _id: equipment._id });
    } else {
      equipment.status = 'Decommissioned';
      equipment.condition = 'Critical / Degraded';
      equipment.notes = `${equipment.notes ? equipment.notes + ' | ' : ''}Decommissioned on ${new Date().toISOString().split('T')[0]} by ${user.name || 'Admin'}`;
      await equipment.save();
    }

    // Write audit log entry
    try {
      await AuditLog.create({
        action: 'DELETE',
        module: 'Equipment',
        description: `${permanent ? 'Permanently deleted' : 'Decommissioned'} hospital asset ${equipment.assetId} (${equipment.name}, Serial: ${equipment.serialNumber})`,
        user: user.name || 'Chief Administrator',
        userId: user.id || null,
        userRole: user.role || 'admin',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });
    } catch (auditErr) {
      console.error('[Equipment DELETE] Audit log write warning:', auditErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Asset ${equipment.assetId} (${equipment.name}) ${permanent ? 'permanently removed' : 'marked as Decommissioned'}.`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error decommissioning equipment asset');
  }
}

