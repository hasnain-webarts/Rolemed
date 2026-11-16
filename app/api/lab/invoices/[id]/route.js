import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import LabInvoice from '@/models/LabInvoice';
import LabOrder from '@/models/LabOrder';
import Patient from '@/models/Patient';
import { dispatchNotification } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const invoice = await LabInvoice.findOne({
      $or: [
        { invoiceId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Laboratory invoice record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        invoice,
        currency: 'PKR',
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Lab Invoice [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching lab invoice' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const existingInvoice = await LabInvoice.findOne({
      $or: [
        { invoiceId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Laboratory invoice record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (body.paymentStatus !== undefined) {
      existingInvoice.paymentStatus = body.paymentStatus;
    }
    if (body.paymentMethod !== undefined) {
      existingInvoice.paymentMethod = body.paymentMethod;
    }
    if (body.notes !== undefined) {
      existingInvoice.notes = body.notes;
    }

    await existingInvoice.save();

    // If invoice is settled as Paid, check if associated LabOrder is Completed and release report
    if (existingInvoice.paymentStatus === 'Paid' && existingInvoice.orderId) {
      (async () => {
        try {
          const labOrder = await LabOrder.findOne({ orderId: existingInvoice.orderId }).lean();
          if (labOrder && labOrder.status === 'Completed') {
            const patient = await Patient.findOne({ patientId: labOrder.patientId }).select('email phone').lean();
            await dispatchNotification({
              recipientId: labOrder.patientId,
              recipientRole: 'patient',
              recipientName: labOrder.patientName,
              recipientEmail: patient?.email || '',
              recipientPhone: patient?.phone || '',
              type: 'LAB_REPORT_READY',
              data: {
                orderId: labOrder.orderId,
                patientId: labOrder.patientId,
                patientName: labOrder.patientName,
                testName: labOrder.testName,
                specimenType: labOrder.specimenType,
                processedBy: labOrder.processedBy,
              },
              channels: ['email', 'whatsapp', 'in_app'],
              metadata: { orderId: labOrder.orderId, invoiceId: existingInvoice.invoiceId, isPaid: true },
            });
          }
        } catch (notifErr) {
          console.warn('[LabInvoice Payment Notification Warning]:', notifErr.message);
        }
      })();
    }

    return NextResponse.json(
      {
        success: true,
        message: `Laboratory invoice ${existingInvoice.invoiceId} updated successfully`,
        invoice: existingInvoice,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Lab Invoice [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating lab invoice' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const invoice = await LabInvoice.findOneAndDelete({
      $or: [
        { invoiceId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Laboratory invoice record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Laboratory invoice ${invoice.invoiceId} voided and removed`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Lab Invoice [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error deleting lab invoice' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

