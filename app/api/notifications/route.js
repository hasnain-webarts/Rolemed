import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Notification from '@/models/Notification';
import { escapeRegex } from '@/lib/escapeRegex';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * GET /api/notifications
 * Retrieves notifications for the authenticated session.
 * Admins can inspect hospital-wide outbox or filter by recipient.
 * Other roles (Doctor, Receptionist, Patient, etc.) are strictly scoped to their own alerts.
 */
export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, [
      'admin',
      'doctor',
      'receptionist',
      'pharmacist',
      'lab-technician',
      'patient',
    ]);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel') || '';
    const status = searchParams.get('status') || '';
    const roleFilter = searchParams.get('role') || '';
    const typeFilter = searchParams.get('type') || '';
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const query = {};

    // Role-based privacy scoping
    if (user.role === 'admin') {
      // Admin can query globally or filter by specific role/recipient
      if (roleFilter && roleFilter.toLowerCase() !== 'all') {
        query.recipientRole = roleFilter.toLowerCase();
      }
    } else if (user.role === 'patient') {
      // Patient only sees their own notifications
      query.recipientId = user.patientId || 'NONE';
    } else {
      // Staff/Doctor sees notifications matching their ID or role
      query.$or = [
        { recipientId: user.employeeId || String(user._id) },
        { recipientEmail: user.email?.toLowerCase() },
        { recipientRole: user.role },
      ];
    }

    if (typeFilter && typeFilter !== 'all') {
      query.type = typeFilter;
    }

    if (status && status !== 'all') {
      if (['unread', 'read', 'dismissed'].includes(status)) {
        query['deliveryStatus.inApp'] = status;
      } else {
        query.$or = [
          { 'deliveryStatus.email': status },
          { 'deliveryStatus.whatsapp': status },
        ];
      }
    }

    if (channel && channel !== 'all') {
      query.channels = channel;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { notificationId: searchRegex },
          { recipientName: searchRegex },
          { recipientEmail: searchRegex },
          { recipientPhone: searchRegex },
          { title: searchRegex },
          { message: searchRegex },
        ],
      });
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        ...query,
        'deliveryStatus.inApp': 'unread',
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        count: notifications.length,
        totalCount,
        unreadCount,
        notifications,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error retrieving notifications');
  }
}

/**
 * PATCH /api/notifications
 * Bulk operation to mark all unread notifications as read for current user
 */
export async function PATCH(req) {
  try {
    const auth = await authenticateRoute(req, [
      'admin',
      'doctor',
      'receptionist',
      'pharmacist',
      'lab-technician',
      'patient',
    ]);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();

    const filter = {};
    if (user.role === 'patient') {
      filter.recipientId = user.patientId;
    } else if (user.role !== 'admin') {
      filter.$or = [
        { recipientId: user.employeeId || String(user._id) },
        { recipientEmail: user.email?.toLowerCase() },
      ];
    }

    filter['deliveryStatus.inApp'] = 'unread';

    const result = await Notification.updateMany(filter, {
      $set: {
        'deliveryStatus.inApp': 'read',
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Marked ${result.modifiedCount} notification(s) as read`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return handleApiError(error, 'Error updating notifications');
  }
}

