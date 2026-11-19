import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute } from '@/lib/authGuard';
import HospitalInvoice from '@/models/HospitalInvoice';
import AuditLog from '@/models/AuditLog';
import mongoose from 'mongoose';

/**
 * GET /api/billing/invoices/[id]
 * Retrieves full details for a single hospital invoice (by _id or invoiceId like INV-1001).
 */
export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Invoice ID is required' }, { status: 400 });
    }

    await connectDB();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { invoiceId: id.toUpperCase() }] }
      : { invoiceId: id.toUpperCase() };

    const invoice = await HospitalInvoice.findOne(query).lean();
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error('[API Hospital Invoice [id] GET Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve invoice' }, { status: 500 });
  }
}

/**
 * PATCH /api/billing/invoices/[id]
 * Updates payment status (e.g. marking Unpaid invoice as Paid, or Waived) with cashier tracking.
 */
export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Invoice ID is required' }, { status: 400 });
    }

    await connectDB();

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { invoiceId: id.toUpperCase() }] }
      : { invoiceId: id.toUpperCase() };

    const invoice = await HospitalInvoice.findOne(query);
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const { paymentStatus, paymentMethod, notes } = body;

    if (paymentStatus && ['Paid', 'Unpaid', 'Waived', 'Refunded'].includes(paymentStatus)) {
      invoice.paymentStatus = paymentStatus;
      if (paymentStatus === 'Paid') {
        invoice.paidAmount = invoice.totalAmount;
        invoice.paidAt = new Date();
        invoice.collectedBy = auth.user?.name || invoice.collectedBy;
      }
    }

    if (paymentMethod) {
      invoice.paymentMethod = paymentMethod;
    }

    if (notes !== undefined) {
      invoice.notes = notes;
    }

    await invoice.save();

    await AuditLog.create({
      action: 'HOSPITAL_INVOICE_UPDATED',
      performedBy: auth.user?.id || 'SYSTEM',
      performedByName: auth.user?.name || 'Cashier',
      performedByRole: auth.user?.role || 'receptionist',
      targetModel: 'HospitalInvoice',
      targetId: invoice._id.toString(),
      details: {
        invoiceId: invoice.invoiceId,
        paymentStatus: invoice.paymentStatus,
        paymentMethod: invoice.paymentMethod,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Invoice ${invoice.invoiceId} updated successfully`,
      invoice,
    });
  } catch (error) {
    console.error('[API Hospital Invoice [id] PATCH Error]:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
  }
}
