import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Notification from '@/models/Notification';
import { dispatchNotification } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const notif = await Notification.findOne({
      $or: [
        { notificationId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!notif) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    const reDispatched = await dispatchNotification({
      recipientId: notif.recipientId,
      recipientRole: notif.recipientRole,
      recipientName: notif.recipientName,
      recipientEmail: notif.recipientEmail,
      recipientPhone: notif.recipientPhone,
      type: notif.type,
      data: notif.metadata || {},
      channels: notif.channels || ['email', 'whatsapp'],
      metadata: { ...notif.metadata, resentFrom: notif.notificationId },
    });

    return NextResponse.json({
      success: true,
      message: `Re-dispatched notification to ${notif.recipientName}`,
      notification: reDispatched,
    });
  } catch (error) {
    return handleApiError(error, 'Error resending notification');
  }
}

