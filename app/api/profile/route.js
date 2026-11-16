import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/db/connectDB';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to access profile' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    let user = null;

    if (session.user.id) {
      user = await User.findById(session.user.id).select('-password');
    } else if (session.user.email) {
      user = await User.findOne({ email: session.user.email.toLowerCase() }).select('-password');
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Staff account profile not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || 'Clinical Pathology & Diagnostics Wing',
          employeeId: user.employeeId || 'EMP-LAB-01',
          phone: user.phone || '03007654321',
          dispensaryWing: user.dispensaryWing || 'Central Inpatient & Outpatient Dispensary',
          labWing: user.labWing || 'Clinical Pathology & Diagnostics Wing',
          licenseNumber: user.licenseNumber || 'RPh-882194-STATE',
          certifications: user.certifications || 'MLT, ASCP Certified Specialist in Blood Banking',
          office: user.office || 'Suite 501, Executive Tower',
          consultationFee: user.consultationFee || 2500,
          bio: user.bio || '',
          deskStation: user.deskStation || 'Main Lobby Entrance • Counter B',
          shift: user.shift || 'Morning (08:00 - 16:00)',
          weeklySchedule: user.weeklySchedule || [],
          leaves: user.leaves || [],
          isOnCall: user.isOnCall !== false,
          avatar: user.avatar || '',
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Profile GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching staff profile' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to update profile' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();

    const {
      name,
      phone,
      dispensaryWing,
      labWing,
      licenseNumber,
      certifications,
      department,
      office,
      consultationFee,
      bio,
      deskStation,
      shift,
      weeklySchedule,
      leaves,
      isOnCall,
      currentPassword,
      newPassword,
    } = body;

    let user = null;

    if (session.user.id) {
      user = await User.findById(session.user.id);
    } else if (session.user.email) {
      user = await User.findOne({ email: session.user.email.toLowerCase() });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Staff account profile not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Handle Password Update
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to update credentials' },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Current password does not match' },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters' },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      user.password = newPassword;
    }

    // Handle Profile Details Update
    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (dispensaryWing !== undefined) user.dispensaryWing = dispensaryWing.trim();
    if (labWing !== undefined) user.labWing = labWing.trim();
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber.trim();
    if (certifications !== undefined) user.certifications = certifications.trim();
    if (office !== undefined) user.office = office.trim();
    if (department !== undefined) user.department = department.trim();
    if (consultationFee !== undefined) user.consultationFee = Number(consultationFee) || 2500;
    if (bio !== undefined) user.bio = bio.trim();
    if (deskStation !== undefined) user.deskStation = deskStation.trim();
    if (shift !== undefined) user.shift = shift.trim();
    if (weeklySchedule !== undefined) user.weeklySchedule = weeklySchedule;
    if (leaves !== undefined) user.leaves = leaves;
    if (isOnCall !== undefined) user.isOnCall = Boolean(isOnCall);

    await user.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Profile updated and saved to MongoDB successfully',
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          office: user.office,
          employeeId: user.employeeId,
          phone: user.phone,
          dispensaryWing: user.dispensaryWing,
          labWing: user.labWing,
          licenseNumber: user.licenseNumber,
          certifications: user.certifications,
          consultationFee: user.consultationFee,
          bio: user.bio,
          deskStation: user.deskStation,
          shift: user.shift,
          weeklySchedule: user.weeklySchedule,
          leaves: user.leaves,
          isOnCall: user.isOnCall,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Profile PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating staff profile' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

