import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import LabOrder from '@/models/LabOrder';
import LabInvoice from '@/models/LabInvoice';
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
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'lab-technician', 'patient']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const labOrder = await LabOrder.findOne({
      $or: [
        { orderId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!labOrder) {
      return NextResponse.json(
        { success: false, error: 'Lab order record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        labOrder,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API LabOrder [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching lab order' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'lab-technician', 'doctor']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const updateData = { ...body };

    // Handle status transitions
    if (body.status === 'In Progress') {
      if (!updateData.specimenCollectedAt) {
        updateData.specimenCollectedAt = new Date();
      }
    } else if (body.status === 'Completed' || body.findings || body.resultMetrics) {
      updateData.status = 'Completed';
      if (!updateData.completedAt) {
        updateData.completedAt = new Date();
      }
      if (!updateData.processedBy) {
        updateData.processedBy = user?.name ? `${user.name}, Lab Technologist` : (body.processedBy || 'Laboratory Technologist');
      }
    } else if (body.status === 'Specimen Rejected') {
      updateData.status = 'Specimen Rejected';
      updateData.rejectedAt = new Date();
      updateData.rejectedBy = user?.name ? `${user.name}, Lab Technologist` : (body.rejectedBy || 'Laboratory Technologist');
      updateData.rejectionReason = body.rejectionReason || body.notes || 'Specimen compromised (hemolyzed, clotted, or insufficient volume)';
    } else if (body.status === 'Recollection Requested') {
      updateData.status = 'Recollection Requested';
      updateData.rejectionReason = body.rejectionReason || 'Recollection requested by clinical laboratory';
    }

    const labOrder = await LabOrder.findOneAndUpdate(
      {
        $or: [
          { orderId: id.toUpperCase() },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        ],
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!labOrder) {
      return NextResponse.json(
        { success: false, error: 'Lab order record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // STRICT FINANCIAL VERIFICATION GATE FOR LAB REPORT RELEASE
    // Reports are released if and only if the corresponding Lab Invoice is Paid.
    // If Unpaid, a payment reminder notification is dispatched instead.
    if (labOrder.status === 'Completed') {
      (async () => {
        try {
          const [invoice, patient] = await Promise.all([
            LabInvoice.findOne({ orderId: labOrder.orderId }).lean(),
            Patient.findOne({ patientId: labOrder.patientId }).select('email phone').lean(),
          ]);

          const isPaid = invoice && invoice.paymentStatus === 'Paid';

          if (isPaid) {
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
              metadata: { orderId: labOrder.orderId, invoiceId: invoice?.invoiceId, isPaid: true },
            });
          } else {
            // Bill is unpaid; dispatch payment reminder notice instead of official report
            await dispatchNotification({
              recipientId: labOrder.patientId,
              recipientRole: 'patient',
              recipientName: labOrder.patientName,
              recipientEmail: patient?.email || '',
              recipientPhone: patient?.phone || '',
              type: 'LAB_PAYMENT_PENDING',
              data: {
                orderId: labOrder.orderId,
                patientId: labOrder.patientId,
                patientName: labOrder.patientName,
                testName: labOrder.testName,
                amountDue: invoice?.totalAmount || invoice?.finalAmount || 0,
              },
              channels: ['email', 'whatsapp', 'in_app'],
              metadata: { orderId: labOrder.orderId, invoiceId: invoice?.invoiceId, isPaid: false },
            });
          }
        } catch (notifErr) {
          console.warn('[LabOrder Notification Gate Warning]:', notifErr.message);
        }
      })();
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Lab order findings updated and saved',
        labOrder,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API LabOrder [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating lab order' },
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

    const labOrder = await LabOrder.findOneAndDelete({
      $or: [
        { orderId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!labOrder) {
      return NextResponse.json(
        { success: false, error: 'Lab order record not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Lab order ${labOrder.orderId} deleted`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API LabOrder [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error deleting lab order' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
