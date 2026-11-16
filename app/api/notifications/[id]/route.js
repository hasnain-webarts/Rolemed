import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Notification from '@/models/Notification';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req, { params }) {
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

    await connectDB();
    const { id } = await params;

    const notification = await Notification.findOne({
      $or: [
        { notificationId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, notification },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error fetching notification');
  }
}

export async function PATCH(req, { params }) {
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

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const update = {};
    if (body.status && ['unread', 'read', 'dismissed'].includes(body.status)) {
      update['deliveryStatus.inApp'] = body.status;
      if (body.status === 'read') update.readAt = new Date();
    }

    const notification = await Notification.findOneAndUpdate(
      {
        $or: [
          { notificationId: id.toUpperCase() },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        ],
      },
      { $set: update },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, notification },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error updating notification');
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const notification = await Notification.findOneAndDelete({
      $or: [
        { notificationId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found to delete' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: `Notification ${notification.notificationId} deleted` },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error deleting notification');
  }
}

