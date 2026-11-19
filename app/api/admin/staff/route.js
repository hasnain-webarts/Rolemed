import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { dispatchNotification } from '@/lib/notificationService';
import escapeRegex from '@/lib/escapeRegex';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || '';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '150', 10);

    const query = {};

    if (role && role.toLowerCase() !== 'all') {
      query.role = role.toLowerCase();
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { employeeId: searchRegex },
        { specialization: searchRegex },
        { phone: searchRegex },
      ];
    }

    const [staffList, roleCountsAgg, activeCount] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).limit(limit).lean(),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]),
      User.countDocuments({ isActive: { $ne: false } }),
    ]);

    const roleMap = {};
    let totalAll = 0;
    for (const r of roleCountsAgg) {
      roleMap[r._id] = r.count;
      totalAll += r.count;
    }

    const counts = {
      all: totalAll,
      doctors: roleMap['doctor'] || 0,
      nurses: roleMap['nurse'] || 0,
      receptionists: roleMap['receptionist'] || 0,
      pharmacists: roleMap['pharmacist'] || 0,
      labTechs: roleMap['lab-technician'] || 0,
      active: activeCount,
    };

    return NextResponse.json(
      {
        success: true,
        count: staffList.length,
        counts,
        staff: staffList,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error fetching staff records');
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const body = await req.json();

    const {
      name,
      email,
      password = 'password123',
      role = 'doctor',
      department = 'General Practice',
      phone = '',
      specialization = '',
      qualifications = 'MBBS',
      experienceYears = 5,
      shift = 'Morning (08:00 - 16:00)',
      office = 'Suite 302, OPD Wing B',
      licenseNumber = '',
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Full practitioner name and email are required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `Account with email ${email} already exists` },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Generate unique sequential employeeId based on role
    const prefix =
      role === 'doctor'
        ? 'EMP-DOC'
        : role === 'receptionist'
        ? 'EMP-REC'
        : role === 'pharmacist'
        ? 'EMP-PHM'
        : role === 'lab-technician'
        ? 'EMP-LAB'
        : 'EMP-STF';

    const lastStaff = await User.findOne({ employeeId: new RegExp(`^${prefix}-\\d+$`) })
      .sort({ createdAt: -1 })
      .select('employeeId')
      .lean();

    let nextNum = 101;
    if (lastStaff && lastStaff.employeeId) {
      const match = lastStaff.employeeId.match(/\d+$/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    const employeeId = `${prefix}-${nextNum}`;

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      department: department.trim(),
      employeeId,
      phone: phone.trim(),
      specialization: specialization.trim(),
      qualifications: qualifications.trim(),
      experienceYears: Number(experienceYears) || 5,
      shift,
      office: office.trim(),
      licenseNumber: licenseNumber.trim() || `LIC-${Math.floor(100000 + Math.random() * 900000)}`,
      isActive: true,
    });

    // Create Audit Log Entry
    try {
      await AuditLog.create({
        action: 'CREATE',
        module: role === 'doctor' ? 'Doctors' : 'Staff',
        description: `Onboarded new staff member: ${newUser.name} (${newUser.role.toUpperCase()}) [ID: ${employeeId}]`,
        user: 'Admin Administrator',
        userRole: 'admin',
        alert: false,
      });
    } catch (auditErr) {
      console.warn('Failed to log audit event:', auditErr.message);
    }

    // Dispatch Staff/Doctor Onboarding Credentials Notification (Email + WhatsApp + In-App)
    dispatchNotification({
      recipientId: newUser.employeeId || String(newUser._id),
      recipientRole: newUser.role,
      recipientName: newUser.name,
      recipientEmail: newUser.email,
      recipientPhone: newUser.phone,
      type: 'STAFF_CREDENTIALS',
      data: {
        name: newUser.name,
        role: newUser.role,
        department: newUser.department,
        email: newUser.email,
        tempPassword: password,
        employeeId: newUser.employeeId,
      },
      channels: ['email', 'whatsapp', 'in_app'],
      metadata: { employeeId: newUser.employeeId, role: newUser.role },
    }).catch((err) => console.warn('[Staff Onboarding Notification Warning]:', err.message));

    const createdStaff = newUser.toObject();
    delete createdStaff.password;

    return NextResponse.json(
      {
        success: true,
        message: `Practitioner ${newUser.name} successfully registered with ID ${employeeId}`,
        staff: createdStaff,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error registering staff member');
  }
}

