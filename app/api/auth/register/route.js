import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/db/connectDB';
import User from '@/models/User';

const VALID_ROLES = ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician'];

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Public registration is disabled. Staff accounts must be provisioned by hospital administrators at /dashboard/admin/staff.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, staffId, role, department, phone } = body;

    // 1. Validation
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required credentials (name, email, password, role)' },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role '${role}'. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // 2. Connect DB
    await connectDB();

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Duplicate checks
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this hospital email address already exists' },
        { status: 409 }
      );
    }

    if (staffId) {
      const existingStaff = await User.findOne({ employeeId: staffId.trim() });
      if (existingStaff) {
        return NextResponse.json(
          { error: 'An account with this Staff Serial ID already exists' },
          { status: 409 }
        );
      }
    }

    // 4. Create user (password will be hashed via UserSchema pre-save hook)
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      department: department || (role === 'doctor' ? 'Cardiology' : role === 'admin' ? 'Administration' : 'General Practice'),
      employeeId: staffId ? staffId.trim() : undefined,
      phone: phone || '',
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Staff profile registered and activated successfully',
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
          employeeId: newUser.employeeId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Registration API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing registration' },
      { status: 500 }
    );
  }
}
