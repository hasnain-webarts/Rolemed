import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import DutyRoster from '@/models/DutyRoster';
import AuditLog from '@/models/AuditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const roster = await DutyRoster.findById(id);
    if (!roster) {
      return NextResponse.json(
        { success: false, error: 'Duty roster record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (body.shift !== undefined) roster.shift = body.shift;
    if (body.status !== undefined) roster.status = body.status;
    if (body.notes !== undefined) roster.notes = body.notes;
    if (body.department !== undefined) roster.department = body.department;
    if (body.date !== undefined) roster.date = body.date;

    await roster.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Duty roster updated successfully',
        roster,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Duty-Roster [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating duty roster' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const roster = await DutyRoster.findByIdAndDelete(id);
    if (!roster) {
      return NextResponse.json(
        { success: false, error: 'Duty roster record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    try {
      await AuditLog.create({
        action: 'DELETE',
        module: 'Schedules',
        description: `Removed shift assignment for ${roster.staffName} (${roster.date})`,
        user: 'Admin Administrator',
        userRole: 'admin',
        alert: false,
      });
    } catch (auditErr) {
      console.warn('Failed to log audit event:', auditErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Duty roster for ${roster.staffName} removed`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Duty-Roster [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error deleting duty roster' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

