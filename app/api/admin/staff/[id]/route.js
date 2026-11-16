import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const user = await User.findOne({
      $or: [
        { employeeId: id.toUpperCase() },
        { email: id.toLowerCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    })
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Staff member record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ success: true, staff: user }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('[API Admin Staff [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching staff record' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const existingUser = await User.findOne({
      $or: [
        { employeeId: id.toUpperCase() },
        { email: id.toLowerCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Staff member record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (body.name !== undefined) existingUser.name = body.name.trim();
    if (body.department !== undefined) existingUser.department = body.department.trim();
    if (body.phone !== undefined) existingUser.phone = body.phone.trim();
    if (body.specialization !== undefined) existingUser.specialization = body.specialization.trim();
    if (body.qualifications !== undefined) existingUser.qualifications = body.qualifications.trim();
    if (body.experienceYears !== undefined) existingUser.experienceYears = Number(body.experienceYears) || 0;
    if (body.shift !== undefined) existingUser.shift = body.shift;
    if (body.office !== undefined) existingUser.office = body.office.trim();
    if (body.licenseNumber !== undefined) existingUser.licenseNumber = body.licenseNumber.trim();
    if (body.isActive !== undefined) existingUser.isActive = Boolean(body.isActive);
    if (body.role !== undefined) existingUser.role = body.role;

    await existingUser.save();

    // Create Audit Log
    try {
      await AuditLog.create({
        action: 'UPDATE',
        module: existingUser.role === 'doctor' ? 'Doctors' : 'Staff',
        description: `Updated profile for staff ${existingUser.name} (${existingUser.employeeId || 'ID'})`,
        user: 'Admin Administrator',
        userRole: 'admin',
        alert: false,
      });
    } catch (auditErr) {
      console.warn('Failed to log audit event:', auditErr.message);
    }

    const updated = existingUser.toObject();
    delete updated.password;

    return NextResponse.json(
      {
        success: true,
        message: `Staff record ${existingUser.name} updated successfully`,
        staff: updated,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Admin Staff [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating staff record' },
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

    const user = await User.findOneAndDelete({
      $or: [
        { employeeId: id.toUpperCase() },
        { email: id.toLowerCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Staff member record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Log deletion as an alert in audit log
    try {
      await AuditLog.create({
        action: 'DELETE',
        module: user.role === 'doctor' ? 'Doctors' : 'Staff',
        description: `Removed staff account: ${user.name} (${user.email}) [ID: ${user.employeeId}]`,
        user: 'Admin Administrator',
        userRole: 'admin',
        alert: true,
      });
    } catch (auditErr) {
      console.warn('Failed to log audit event:', auditErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Staff account ${user.name} deleted successfully`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Admin Staff [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error deleting staff record' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

